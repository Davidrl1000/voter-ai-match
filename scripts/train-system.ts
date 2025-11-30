import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import OpenAI from 'openai';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

// ============================================
// TYPES
// ============================================

interface Candidate {
  candidateId: string;
  name: string;
  pdfPath: string;
  image: string;
}

interface PolicyPosition {
  policyArea: string;
  stance: string;
  quote: string;
  embedding: number[];
}

interface Question {
  questionId: string;
  text: string;
  options: string[];
  policyArea: string;
  format: 'agreement-scale' | 'specific-choice';
  weight: number;
  embedding: number[];
}

// ============================================
// CONFIGURATION
// ============================================

const POLICY_AREAS = [
  'economy',
  'healthcare',
  'education',
  'security',
  'environment',
  'social',
  'infrastructure'
];

const CHUNK_SIZE = 2000; // tokens
const CHUNK_OVERLAP = 200; // tokens
const QUESTIONS_PER_AREA = 143; // 1000 total / 7 areas ≈ 143 per area

// ============================================
// INITIALIZE CLIENTS
// ============================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

// ============================================
// PDF PROCESSING
// ============================================

async function extractTextFromPDF(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return data.text;
}

function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

function chunkText(text: string, maxTokens: number, overlap: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());

      // Keep overlap
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 4));
      currentChunk = overlapWords.join(' ') + ' ';
      currentTokens = estimateTokens(currentChunk);
    }

    currentChunk += sentence;
    currentTokens += sentenceTokens;
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// ============================================
// EMBEDDING GENERATION
// ============================================

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

// ============================================
// POLICY EXTRACTION
// ============================================

async function extractPolicyPositions(
  candidateName: string,
  chunks: string[]
): Promise<PolicyPosition[]> {
  const allPositions: PolicyPosition[] = [];

  console.log(`  Extracting policy positions for ${candidateName}...`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`    Processing chunk ${i + 1}/${chunks.length}...`);

    const prompt = `You are analyzing a political candidate's policy document.

Candidate: ${candidateName}
Document excerpt:
"""
${chunk}
"""

Extract ALL clear policy positions from this text. For each position:
1. Identify the policy area: ${POLICY_AREAS.join(', ')}
2. State the candidate's specific stance (be precise and neutral)
3. Include a direct supporting quote from the text

Return ONLY a JSON array with this exact structure:
[
  {
    "policyArea": "economy",
    "stance": "specific policy position",
    "quote": "exact quote from document"
  }
]

If no clear policy positions are found, return an empty array: []`;

    try {
      const response = await openai.chat.completions.create({
        model: 'o1-pro',
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.choices[0].message.content || '[]';
      const positions = JSON.parse(content);

      // Generate embeddings for each position
      for (const position of positions) {
        const embeddingText = `${position.policyArea}: ${position.stance}`;
        position.embedding = await generateEmbedding(embeddingText);
        allPositions.push(position);
      }

      console.log(`    Found ${positions.length} positions in this chunk`);
    } catch (error) {
      console.error(`    Error processing chunk ${i + 1}:`, error);
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`  Total positions extracted: ${allPositions.length}`);
  return allPositions;
}

// ============================================
// QUESTION GENERATION
// ============================================

async function generateQuestions(
  allCandidatePositions: Map<string, PolicyPosition[]>
): Promise<Question[]> {
  console.log('\n📝 Generating question bank...');

  const allPositions: PolicyPosition[] = [];
  allCandidatePositions.forEach(positions => {
    allPositions.push(...positions);
  });

  // Group positions by policy area
  const positionsByArea = POLICY_AREAS.reduce((acc, area) => {
    acc[area] = allPositions.filter(p => p.policyArea === area);
    return acc;
  }, {} as Record<string, PolicyPosition[]>);

  const allQuestions: Question[] = [];

  for (const policyArea of POLICY_AREAS) {
    const positions = positionsByArea[policyArea];

    if (positions.length === 0) {
      console.log(`  ⚠️  No positions found for ${policyArea}, skipping...`);
      continue;
    }

    console.log(`  Generating questions for ${policyArea} (${positions.length} positions)...`);

    const positionSummaries = positions
      .map(p => `- ${p.stance}`)
      .slice(0, 50) // Limit to avoid token overflow
      .join('\n');

    const prompt = `You are creating questions for a neutral voter assistance tool.

Policy Area: ${policyArea}

Candidate positions in this area:
${positionSummaries}

Generate ${QUESTIONS_PER_AREA} diverse questions about ${policyArea} policy.

Requirements:
- 70% should be agreement scale questions (Strongly agree/Agree/Neutral/Disagree/Strongly disagree)
- 30% should be specific policy choice questions (3 distinct policy options)
- ALL questions MUST include "Not important to me" as the final option
- Questions must be neutral (no partisan framing)
- Cover different aspects of ${policyArea}
- Questions should help voters distinguish between candidates

Return ONLY a JSON array with this exact structure:
[
  {
    "text": "question text",
    "options": ["option1", "option2", "option3", "Not important to me"],
    "format": "agreement-scale" or "specific-choice"
  }
]`;

    try {
      const response = await openai.chat.completions.create({
        model: 'o1-pro',
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.choices[0].message.content || '[]';
      const questions = JSON.parse(content);

      // Process and store questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionId = `q-${policyArea}-${String(i + 1).padStart(3, '0')}`;

        const embedding = await generateEmbedding(q.text);

        allQuestions.push({
          questionId,
          text: q.text,
          options: q.options,
          policyArea,
          format: q.format,
          weight: 1.0,
          embedding
        });
      }

      console.log(`  ✓ Generated ${questions.length} questions for ${policyArea}`);
    } catch (error) {
      console.error(`  ✗ Error generating questions for ${policyArea}:`, error);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✓ Total questions generated: ${allQuestions.length}`);
  return allQuestions;
}

// ============================================
// DYNAMODB STORAGE
// ============================================

async function storeCandidatePositions(
  candidateId: string,
  name: string,
  pdfPath: string,
  image: string,
  policyPositions: PolicyPosition[]
) {
  const command = new PutCommand({
    TableName: process.env.CANDIDATE_POSITIONS_TABLE || 'candidate-positions',
    Item: {
      candidateId,
      name,
      pdfPath,
      image,
      policyPositions,
      processedAt: new Date().toISOString()
    }
  });

  await docClient.send(command);
  console.log(`✓ Stored positions for ${name} in DynamoDB`);
}

async function storeQuestionBank(questions: Question[]) {
  console.log('\n💾 Storing question bank in DynamoDB...');

  // DynamoDB batch write limit is 25 items
  const batches = [];
  for (let i = 0; i < questions.length; i += 25) {
    batches.push(questions.slice(i, i + 25));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const command = new BatchWriteCommand({
      RequestItems: {
        [process.env.QUESTION_BANK_TABLE || 'question-bank']: batch.map(q => ({
          PutRequest: {
            Item: q
          }
        }))
      }
    });

    await docClient.send(command);
    console.log(`  Batch ${i + 1}/${batches.length} stored`);

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`✓ All ${questions.length} questions stored in DynamoDB`);
}

// ============================================
// MAIN TRAINING FUNCTION
// ============================================

async function trainSystem(candidatesJsonPath: string) {
  console.log('🚀 Starting system training...\n');

  const startTime = Date.now();

  // Load candidates
  const candidatesData = JSON.parse(fs.readFileSync(candidatesJsonPath, 'utf-8'));
  const candidates: Candidate[] = candidatesData;

  console.log(`📋 Found ${candidates.length} candidates\n`);

  // Step 1: Process each candidate's PDF
  const allCandidatePositions = new Map<string, PolicyPosition[]>();

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    console.log(`\n[${i + 1}/${candidates.length}] Processing ${candidate.name}...`);

    try {
      // Extract text
      console.log(`  📄 Extracting text from ${candidate.pdfPath}...`);
      const text = await extractTextFromPDF(candidate.pdfPath);
      console.log(`  ✓ Extracted ${text.length} characters`);

      // Chunk text
      console.log(`  ✂️  Chunking text...`);
      const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
      console.log(`  ✓ Created ${chunks.length} chunks`);

      // Extract policy positions
      const positions = await extractPolicyPositions(candidate.name, chunks);

      // Store in DynamoDB
      await storeCandidatePositions(
        candidate.candidateId,
        candidate.name,
        candidate.pdfPath,
        candidate.image,
        positions
      );

      allCandidatePositions.set(candidate.candidateId, positions);

    } catch (error) {
      console.error(`  ✗ Error processing ${candidate.name}:`, error);
    }
  }

  // Step 2: Generate question bank
  const questions = await generateQuestions(allCandidatePositions);

  // Step 3: Store question bank
  await storeQuestionBank(questions);

  // Step 4: Save backup to file
  const backupDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(backupDir, 'question-bank-backup.json'),
    JSON.stringify(questions, null, 2)
  );
  console.log('\n✓ Backup saved to data/question-bank-backup.json');

  // Final report
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 TRAINING COMPLETE');
  console.log('='.repeat(60));
  console.log(`\n⏱️  Duration: ${duration} minutes`);
  console.log(`\n✅ Results:`);
  console.log(`   Candidates processed: ${candidates.length}`);
  console.log(`   Questions generated:  ${questions.length}`);
  console.log('\n' + '='.repeat(60));
}

// ============================================
// RUN
// ============================================

const candidatesPath = process.argv[2] || './candidates.json';

trainSystem(candidatesPath)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Training failed:', error);
    process.exit(1);
  });