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
  chunkText,
  detectBiasIndicators
} from '../lib/training/utils';

import {
  POLICY_EXTRACTION_PROMPT,
  QUESTION_GENERATION_PROMPT,
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
  questionsPerPolicyArea: Math.floor(parseInt(process.env.QUESTION_COUNT || '150') / 7),
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

async function extractPolicyPositions(
  candidate: Candidate,
  text: string,
  progressTracker: ProgressTracker
): Promise<PolicyPosition[]> {
  logProgress(`Extracting policy positions for ${candidate.name}`);

  const chunks = chunkText(text, CONFIG.chunkSize, CONFIG.chunkOverlap);
  logProgress(`  Created ${chunks.length} chunks`);

  const allPositions: PolicyPosition[] = [];

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

      for (const policyArea of CONFIG.policyAreas) {
        const position = extractedPositions[policyArea];

        if (!position || position.includes('No se menciona')) {
          continue;
        }

        const embeddingText = `${policyArea}: ${position}`;
        const embedding = await generateEmbedding(embeddingText);

        const policyPosition: PolicyPosition = {
          candidateId: candidate.candidateId,
          policyArea,
          position,
          embedding,
          extractedAt: new Date().toISOString(),
        };

        if (validatePolicyPosition(policyPosition)) {
          allPositions.push(policyPosition);
          progressTracker.completePolicyArea(candidate.candidateId, policyArea);
        } else {
          console.warn(`    Invalid policy position for ${policyArea}, skipping`);
        }
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

  logProgress(`  Total positions extracted: ${allPositions.length}`);
  return allPositions;
}

async function generateQuestionsForArea(
  policyArea: string,
  questionCount: number,
  progressTracker: ProgressTracker
): Promise<Question[]> {
  logProgress(`Generating ${questionCount} questions for ${policyArea}`);

  const prompt = QUESTION_GENERATION_PROMPT
    .replace(/{policyArea}/g, policyArea)
    .replace(/{questionCount}/g, String(questionCount));

  try {
    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: CONFIG.model.questions,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
    }, CONFIG.retries, CONFIG.backoffMs);

    const content = response.choices[0].message.content || '{"questions":[]}';
    const parsed = JSON.parse(content);
    const rawQuestions = parsed.questions || [];

    const questions: Question[] = [];

    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i];
      const questionId = `q-${policyArea}-${String(i + 1).padStart(3, '0')}`;
      const embedding = await generateEmbedding(q.text);

      const biasIndicators = detectBiasIndicators(q.text);
      if (biasIndicators.length > 0) {
        console.warn(`    Bias indicators in question ${questionId}:`, biasIndicators);
      }

      const question: Question = {
        questionId,
        policyArea,
        text: q.text,
        type: q.type || q.format,
        options: q.options,
        embedding,
        weight: 1.0,
        biasScore: biasIndicators.length > 0 ? 10 - biasIndicators.length : 10,
      };

      if (validateQuestion(question)) {
        questions.push(question);
      } else {
        console.warn(`    Invalid question ${questionId}, skipping`);
      }
    }

    progressTracker.updateQuestionGeneration(policyArea, questions.length, questions.length);

    const tokens = response.usage?.total_tokens || 0;
    const cost = estimateCost(CONFIG.model.questions, tokens);
    progressTracker.addCost(CONFIG.model.questions, cost);

    logProgress(`  ✓ Generated ${questions.length} questions for ${policyArea}`);
    await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenCalls));

    return questions;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ Error generating questions for ${policyArea}: ${errorMsg}`);
    progressTracker.addError({
      policyArea,
      error: `Question generation failed: ${errorMsg}`,
      timestamp: new Date(),
    });
    return [];
  }
}

async function generateAllQuestions(progressTracker: ProgressTracker): Promise<Question[]> {
  logProgress('\n📝 Generating question bank');

  const allQuestions: Question[] = [];

  for (const policyArea of CONFIG.policyAreas) {
    const questions = await generateQuestionsForArea(
      policyArea,
      CONFIG.questionsPerPolicyArea,
      progressTracker
    );
    allQuestions.push(...questions);
  }

  logProgress(`\n✓ Total questions generated: ${allQuestions.length}`);
  return allQuestions;
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
  console.log(`📊 Mode: ${CONFIG.dryRun ? 'DRY RUN (3 candidates)' : 'PRODUCTION (all candidates)'}\n`);

  const startTime = Date.now();

  const candidates = CONFIG.dryRun ? loadCandidatesForTesting(1) : loadCandidates();

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

  const questions = await generateAllQuestions(progressTracker);

  if (questions.length > 0) {
    await storeQuestionBank(questions);
  } else {
    throw new Error('No questions generated');
  }

  const backupDir = path.join(process.cwd(), 'data', 'training-backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `question-bank-${timestamp}.json`);

  fs.writeFileSync(backupPath, JSON.stringify(questions, null, 2), 'utf-8');
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
  console.log(`   Candidates processed: ${progressTracker.getProgress().candidates.processed}`);
  console.log(`   Candidates failed:    ${progressTracker.getProgress().candidates.failed}`);
  console.log(`   Questions generated:  ${questions.length}`);
  console.log(`   Estimated cost:       $${progressTracker.getProgress().costs.totalEstimated.toFixed(4)}`);
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
