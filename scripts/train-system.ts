#!/usr/bin/env tsx
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

import {
  retryWithBackoff,
  validatePolicyPosition,
  validateQuestion,
  estimateCost,
  logProgress,
  chunkText
} from '../lib/training/utils';

import { checkQuestionNeutrality, formatBiasCheckSummary } from '../lib/neutrality/bias-checker';

import {
  POLICY_EXTRACTION_PROMPT,
  formatReverseQuestionPrompt,
} from '../lib/training/prompts-es-cr';

import {
  loadCandidates,
  loadCandidatesForTesting,
  validateAllCandidates,
  type Candidate
} from '../lib/training/candidate-mapper';

import { ProgressTracker } from '../lib/training/progress-tracker';

interface PolicyPosition {
  candidateId: string;
  policyArea: string;
  position: string;
  embedding: number[];
  extractedAt: string;
}

interface Question {
  questionId: string;
  policyArea: string;
  text: string;
  type: 'agreement-scale' | 'specific-choice';
  options?: string[];
  embedding: number[];
  weight: number;
  biasScore?: number;
}

interface PositionWithCandidate extends PolicyPosition {
  candidateName: string;
}

const CONFIG = {
  model: {
    extraction: process.env.NODE_ENV === 'production' ? 'o1-pro' : 'gpt-4o-mini',
    questions: process.env.NODE_ENV === 'production' ? 'o1-pro' : 'gpt-4o-mini',
    embedding: 'text-embedding-3-small',
  },
  language: 'es',
  retries: 3,
  backoffMs: 1000,
  delayBetweenCalls: 1000,
  questionCount: parseInt(process.env.QUESTION_COUNT || '150'),
  questionsPerPolicyArea: Math.ceil(parseInt(process.env.QUESTION_COUNT || '150') / 7),
  chunkSize: 2000,
  chunkOverlap: 200,
  policyAreas: ['economy', 'healthcare', 'education', 'security', 'environment', 'social', 'infrastructure'],
  tables: {
    candidatePositions: process.env.CANDIDATE_POSITIONS_TABLE || 'candidate-positions-dev',
    questionBank: process.env.QUESTION_BANK_TABLE || 'question-bank-dev',
  },
  dryRun: process.env.DRY_RUN === 'true' || process.env.NODE_ENV !== 'production',
};

logProgress('Training Configuration', {
  model: CONFIG.model,
  questionCount: CONFIG.questionCount,
  dryRun: CONFIG.dryRun,
  tables: CONFIG.tables,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

async function extractTextFromPDF(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(dataBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText;
}

async function generateEmbedding(text: string): Promise<number[]> {
  return retryWithBackoff(async () => {
    const response = await openai.embeddings.create({
      model: CONFIG.model.embedding,
      input: text,
    });
    return response.data[0].embedding;
  }, CONFIG.retries, CONFIG.backoffMs);
}

// Generate one neutral question from a candidate position (reverse training)
async function generateReverseQuestion(
  position: PositionWithCandidate,
  questionNumber: number,
  variantNumber: number = 1
): Promise<Question | null> {
  const prompt = formatReverseQuestionPrompt(
    position.candidateName,
    position.position,
    position.policyArea,
    variantNumber
  );

  try {
    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: CONFIG.model.questions,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
    }, CONFIG.retries, CONFIG.backoffMs);

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);

    if (!parsed.text || !parsed.type) {
      console.warn(`  Invalid reverse question generated for ${position.policyArea}`);
      return null;
    }

    const questionId = `q-${position.policyArea}-rev-${String(questionNumber).padStart(3, '0')}-v${variantNumber}`;
    const embedding = await generateEmbedding(parsed.text);

    const question: Question = {
      questionId,
      policyArea: position.policyArea,
      text: parsed.text,
      type: parsed.type,
      options: parsed.options || undefined,
      embedding,
      weight: 1.0,
      biasScore: 10,
    };

    if (validateQuestion(question)) {
      return question;
    } else {
      console.warn(`  Invalid reverse question ${questionId}, skipping`);
      return null;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`  Error generating reverse question for ${position.policyArea}: ${errorMsg}`);
    return null;
  }
}

// Generate reverse questions from all candidate positions
async function generateReverseQuestionsFromPositions(
  allPositions: PolicyPosition[],
  candidates: Candidate[]
): Promise<Question[]> {
  logProgress('\n🔄 Generating reverse questions from candidate positions...');

  const candidateMap = new Map(candidates.map(c => [c.candidateId, c.name]));

  const positionsWithNames: PositionWithCandidate[] = allPositions.map(pos => ({
    ...pos,
    candidateName: candidateMap.get(pos.candidateId) || 'Unknown',
  }));

  logProgress(`  Total positions to convert: ${positionsWithNames.length}`);
  logProgress(`  Generating 3 variants per position for question variety`);
  logProgress(`  Expected total questions: ${positionsWithNames.length * 3}`);

  const reverseQuestions: Question[] = [];
  let questionNumber = 1;

  for (let i = 0; i < positionsWithNames.length; i++) {
    const position = positionsWithNames[i];

    logProgress(`  [${i + 1}/${positionsWithNames.length}] Generating 3 variants for ${position.candidateName} - ${position.policyArea}`);

    // Generate 3 variants of the question for this position
    for (let variantNum = 1; variantNum <= 3; variantNum++) {
      let question: Question | null = null;
      let retries = 0;
      const maxRetries = 2;

      // Retry loop for bias checking
      while (retries <= maxRetries && !question) {
        const candidate = await generateReverseQuestion(position, questionNumber, variantNum);

        if (!candidate) {
          logProgress(`    ✗ Variant ${variantNum}: Failed to generate (attempt ${retries + 1}/${maxRetries + 1})`);
          retries++;
          continue;
        }

        // Check for bias
        const biasCheck = await checkQuestionNeutrality([candidate]);

        if (biasCheck.issues.length === 0) {
          // No bias - accept this question
          question = candidate;
          reverseQuestions.push(question);
          logProgress(`    ✓ Variant ${variantNum}: "${question.text.substring(0, 70)}..." (score: ${biasCheck.score}/100)`);
        } else {
          // Bias detected - log and retry
          const issue = biasCheck.issues[0];
          logProgress(`    ⚠️  Variant ${variantNum}: Bias detected [${issue.category}] - ${issue.matchedKeywords.join(', ')} (attempt ${retries + 1}/${maxRetries + 1})`);

          if (retries < maxRetries) {
            logProgress(`    🔄 Retrying variant ${variantNum}...`);
            retries++;
          } else {
            logProgress(`    ✗ Variant ${variantNum}: Skipped after ${maxRetries + 1} attempts with bias`);
            retries++;
          }
        }

        // Small delay to avoid overwhelming API
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenCalls));
      }
    }

    questionNumber++; // Increment position number after all variants
  }

  logProgress(`\n✓ Generated ${reverseQuestions.length}/${positionsWithNames.length * 3} reverse questions (3 variants per position)`);

  return reverseQuestions;
}

async function extractPolicyPositions(
  candidate: Candidate,
  text: string,
  progressTracker: ProgressTracker
): Promise<PolicyPosition[]> {
  logProgress(`Extracting policy positions for ${candidate.name}`);

  const chunks = chunkText(text, CONFIG.chunkSize, CONFIG.chunkOverlap);
  logProgress(`  Created ${chunks.length} chunks`);

  // Use Map to deduplicate positions by policyArea
  // Key: policyArea, Value: accumulated position text fragments
  const positionMap = new Map<string, string[]>();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    logProgress(`  Processing chunk ${i + 1}/${chunks.length}`);

    const prompt = `${POLICY_EXTRACTION_PROMPT}\n\n${chunk}`;

    try {
      const response = await retryWithBackoff(async () => {
        return await openai.chat.completions.create({
          model: CONFIG.model.extraction,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        });
      }, CONFIG.retries, CONFIG.backoffMs);

      const content = response.choices[0].message.content || '{}';

      let extractedPositions: Record<string, string>;
      try {
        extractedPositions = JSON.parse(content);
      } catch {
        console.warn(`    Failed to parse JSON response for chunk ${i + 1}, skipping`);
        continue;
      }

      // Accumulate positions from this chunk
      for (const policyArea of CONFIG.policyAreas) {
        const position = extractedPositions[policyArea];

        if (!position || position.includes('No se menciona')) {
          continue;
        }

        // Add this position fragment to the map
        if (!positionMap.has(policyArea)) {
          positionMap.set(policyArea, []);
        }
        positionMap.get(policyArea)!.push(position);
        logProgress(`    Found position fragment for ${policyArea}`);
      }

      const tokens = response.usage?.total_tokens || 0;
      const cost = estimateCost(CONFIG.model.extraction, tokens);
      progressTracker.addCost(CONFIG.model.extraction, cost);

      logProgress(`    Found ${Object.keys(extractedPositions).length} positions in this chunk`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenCalls));

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`    Error processing chunk ${i + 1}: ${errorMsg}`);
      progressTracker.addError({
        candidateId: candidate.candidateId,
        error: `Chunk ${i + 1} extraction failed: ${errorMsg}`,
        timestamp: new Date(),
      });
    }
  }

  // Now create final deduplicated positions by merging fragments
  logProgress(`  Merging position fragments across ${chunks.length} chunks...`);
  const allPositions: PolicyPosition[] = [];

  for (const [policyArea, fragments] of positionMap.entries()) {
    logProgress(`  Merging ${fragments.length} fragments for ${policyArea}...`);

    // Merge fragments: join with separator, then deduplicate similar sentences
    const mergedPosition = deduplicateAndMerge(fragments);

    const embeddingText = `${policyArea}: ${mergedPosition}`;
    const embedding = await generateEmbedding(embeddingText);

    const policyPosition: PolicyPosition = {
      candidateId: candidate.candidateId,
      policyArea,
      position: mergedPosition,
      embedding,
      extractedAt: new Date().toISOString(),
    };

    if (validatePolicyPosition(policyPosition)) {
      allPositions.push(policyPosition);
      progressTracker.completePolicyArea(candidate.candidateId, policyArea);
    } else {
      console.warn(`    Invalid merged policy position for ${policyArea}, skipping`);
    }
  }

  logProgress(`  ✓ Final deduplicated positions: ${allPositions.length} (merged from ${chunks.length} chunks)`);
  return allPositions;
}

// Deduplicate and merge position fragments from multiple chunks
function deduplicateAndMerge(fragments: string[]): string {
  if (fragments.length === 0) return '';
  if (fragments.length === 1) return fragments[0];

  // Split into sentences and deduplicate
  const seenSentences = new Set<string>();
  const uniqueSentences: string[] = [];

  for (const fragment of fragments) {
    // Split by sentence boundaries (. ! ?)
    const sentences = fragment.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

    for (const sentence of sentences) {
      // Normalize for comparison (lowercase, remove extra whitespace)
      const normalized = sentence.toLowerCase().replace(/\s+/g, ' ').trim();

      if (!seenSentences.has(normalized) && sentence.length > 10) {
        seenSentences.add(normalized);
        uniqueSentences.push(sentence);
      }
    }
  }

  // Rejoin sentences
  return uniqueSentences.join('. ') + '.';
}

async function runFinalNeutralityCheck(allQuestions: Question[]): Promise<void> {
  if (allQuestions.length === 0) return;

  logProgress('\n🔍 Running final neutrality check on all questions...');
  const finalCheck = await checkQuestionNeutrality(allQuestions);
  console.log(formatBiasCheckSummary(finalCheck));

  if (!finalCheck.passed) {
    throw new Error(
      `❌ Final neutrality check FAILED\n` +
      `Score: ${finalCheck.score}/100\n` +
      `Flagged: ${finalCheck.summary.flaggedQuestions}/${finalCheck.summary.totalQuestions} questions\n` +
      `This should not happen after per-area checks. Please review the bias checker configuration.`
    );
  }

  logProgress(`✓ All questions passed final neutrality check (score: ${finalCheck.score}/100)`);
}

async function storeCandidatePositions(
  candidate: Candidate,
  policyPositions: PolicyPosition[]
): Promise<void> {
  for (const position of policyPositions) {
    const command = new PutCommand({
      TableName: CONFIG.tables.candidatePositions,
      Item: {
        candidateId: candidate.candidateId,
        policyArea: position.policyArea,
        name: candidate.name,
        party: candidate.party,
        position: position.position,
        embedding: position.embedding,
        extractedAt: position.extractedAt,
      }
    });

    await retryWithBackoff(
      async () => await docClient.send(command),
      CONFIG.retries,
      CONFIG.backoffMs
    );
  }

  logProgress(`✓ Stored ${policyPositions.length} positions for ${candidate.name} in DynamoDB`);
}

// Load comprehensive questions from JSON file (guarantee 100% candidate coverage)
function loadComprehensiveQuestions(): Question[] {
  const comprehensivePath = path.join(process.cwd(), 'data', 'comprehensive-questions.json');

  if (!fs.existsSync(comprehensivePath)) {
    logProgress('⚠️  Comprehensive questions file not found, skipping');
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(comprehensivePath, 'utf-8'));
    const questions: Question[] = data.questions || [];

    logProgress(`✓ Loaded ${questions.length} comprehensive questions from file`);
    return questions;
  } catch (error) {
    console.warn('⚠️  Failed to load comprehensive questions:', error);
    return [];
  }
}

async function storeQuestionBank(questions: Question[]): Promise<void> {
  logProgress('\n💾 Storing question bank in DynamoDB');

  const batches: Question[][] = [];
  for (let i = 0; i < questions.length; i += 25) {
    batches.push(questions.slice(i, i + 25));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const command = new BatchWriteCommand({
      RequestItems: {
        [CONFIG.tables.questionBank]: batch.map(q => ({
          PutRequest: {
            Item: q
          }
        }))
      }
    });

    await retryWithBackoff(
      async () => await docClient.send(command),
      CONFIG.retries,
      CONFIG.backoffMs
    );

    logProgress(`  Batch ${i + 1}/${batches.length} stored`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  logProgress(`✓ All ${questions.length} questions stored in DynamoDB`);
}

async function trainSystem(): Promise<void> {
  console.log('🚀 Starting system training...\n');
  console.log(`🌍 Language: Spanish (Costa Rica)`);
  console.log(`🤖 Model: ${CONFIG.model.extraction} (extraction), ${CONFIG.model.questions} (questions)`);
  console.log(`📊 Mode: ${CONFIG.dryRun ? 'TRAINING' : 'PRODUCTION'}\n`);

  const startTime = Date.now();

  const candidates = CONFIG.dryRun ? loadCandidatesForTesting() : loadCandidates();

  const validation = validateAllCandidates(candidates);
  if (!validation.valid) {
    throw new Error('Candidate validation failed. Please fix the errors above.');
  }

  const progressTracker = new ProgressTracker({
    model: CONFIG.model.extraction,
    questionCount: CONFIG.questionCount,
    dryRun: CONFIG.dryRun,
    candidateCount: candidates.length,
  });

  progressTracker.startAutoSave();

  for (const candidate of candidates) {
    progressTracker.initializeCandidate(candidate.candidateId, candidate.name);
  }

  logProgress(`\n📋 Processing ${candidates.length} candidates`);

  // Collect all positions from all candidates
  const allPositions: PolicyPosition[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    logProgress(`\n[${i + 1}/${candidates.length}] Processing ${candidate.name}`);

    progressTracker.startCandidate(candidate.candidateId);

    try {
      logProgress(`  📄 Extracting text from PDF`);
      const text = await extractTextFromPDF(candidate.pdfPath);
      logProgress(`  ✓ Extracted ${text.length} characters`);

      const positions = await extractPolicyPositions(candidate, text, progressTracker);

      if (positions.length > 0) {
        await storeCandidatePositions(candidate, positions);
        allPositions.push(...positions); // Collect positions for reverse training
        progressTracker.completeCandidate(candidate.candidateId);
      } else {
        throw new Error('No policy positions extracted');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ Error processing ${candidate.name}: ${errorMsg}`);
      progressTracker.failCandidate(candidate.candidateId, errorMsg);
    }

    progressTracker.printSummary();
  }

  logProgress(`\n✓ Total positions collected: ${allPositions.length}`);

  // Generate questions using BOTH reverse training AND independent generation
  logProgress('\n' + '='.repeat(60));
  logProgress('📝 QUESTION GENERATION PHASE');
  logProgress('='.repeat(60));

  // Generate reverse questions from positions (one question per candidate position)
  // This approach guarantees 100% candidate coverage since every position has a matching question
  const allQuestions = await generateReverseQuestionsFromPositions(
    allPositions,
    candidates
  );

  logProgress(`\n✓ Total question bank: ${allQuestions.length} questions (reverse training)`);

  // Load and merge comprehensive questions (guarantee 100% candidate coverage)
  logProgress('\n📦 Loading comprehensive questions...');
  const comprehensiveQuestions = loadComprehensiveQuestions();

  if (comprehensiveQuestions.length > 0) {
    const existingIds = new Set(allQuestions.map(q => q.questionId));
    const newComprehensive = comprehensiveQuestions.filter(q => !existingIds.has(q.questionId));
    allQuestions.push(...newComprehensive);
    logProgress(`✓ Added ${newComprehensive.length} comprehensive questions`);
    logProgress(`  Total questions: ${allQuestions.length}`);
  } else {
    logProgress('⚠️  No comprehensive questions loaded - coverage may be reduced');
  }

  await runFinalNeutralityCheck(allQuestions);

  // Store questions
  if (allQuestions.length > 0) {
    await storeQuestionBank(allQuestions);
  } else {
    throw new Error('No questions generated');
  }

  const backupDir = path.join(process.cwd(), 'data', 'training-backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `question-bank-${timestamp}.json`);

  fs.writeFileSync(backupPath, JSON.stringify(allQuestions, null, 2), 'utf-8');
  logProgress(`\n✓ Backup saved to ${backupPath}`);

  progressTracker.complete();
  progressTracker.stopAutoSave();

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 TRAINING COMPLETE');
  console.log('='.repeat(60));
  console.log(`\n⏱️  Duration: ${duration} minutes`);
  console.log(`\n✅ Results:`);
  console.log(`   Candidates processed:     ${progressTracker.getProgress().candidates.processed}`);
  console.log(`   Candidates failed:        ${progressTracker.getProgress().candidates.failed}`);
  console.log(`   Positions extracted:      ${allPositions.length}`);
  console.log(`   Questions generated:      ${allQuestions.length} (reverse + comprehensive)`);
  console.log(`   Comprehensive questions:  ${comprehensiveQuestions.length} (for 100% coverage)`);
  console.log(`   Estimated cost:           $${progressTracker.getProgress().costs.totalEstimated.toFixed(4)}`);
  console.log('\n' + '='.repeat(60) + '\n');
}

trainSystem()
  .then(() => {
    logProgress('✓ Training completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Training failed:', error);
    process.exit(1);
  });
