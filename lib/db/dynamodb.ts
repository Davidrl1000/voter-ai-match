import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

export const docClient = DynamoDBDocumentClient.from(client);

const TABLES = {
  candidatePositions: process.env.CANDIDATE_POSITIONS_TABLE || 'candidate-positions-dev',
  questionBank: process.env.QUESTION_BANK_TABLE || 'question-bank-dev',
  matchResults: process.env.MATCH_RESULTS_TABLE || 'match-results-dev',
  aggregatedStats: process.env.AGGREGATED_STATS_TABLE || 'aggregated-stats-dev',
};

export interface Question {
  questionId: string;
  policyArea: string;
  text: string;
  type: 'agreement-scale' | 'specific-choice';
  options?: string[];
  embedding: number[];
  weight: number;
  biasScore?: number;
}

export interface CandidatePosition {
  candidateId: string;
  policyArea: string;
  name: string;
  party: string;
  position: string;
  embedding: number[];
  extractedAt: string;
}

export async function getQuestions(limit: number = 20, randomize: boolean = true): Promise<Question[]> {
  const questions: Question[] = [];
  const seenIds = new Set<string>(); // Track question IDs to prevent duplicates
  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

  // For randomization: skip a random number of items first (0-200)
  // Kept smaller to avoid going past available questions
  if (randomize) {
    const randomSkip = Math.floor(Math.random() * 200);
    if (randomSkip > 0) {
      const skipCommand = new ScanCommand({
        TableName: TABLES.questionBank,
        Limit: randomSkip,
      });
      const skipResponse = await docClient.send(skipCommand);
      lastEvaluatedKey = skipResponse.LastEvaluatedKey;
    }
  }

  // Keep scanning until we have enough questions or no more items
  while (questions.length < limit) {
    const command: ScanCommand = new ScanCommand({
      TableName: TABLES.questionBank,
      Limit: limit - questions.length, // Only request what we still need
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await docClient.send(command);
    const items = (response.Items || []) as Question[];

    // Filter out duplicates (can happen with wrap-around)
    for (const item of items) {
      if (!seenIds.has(item.questionId)) {
        seenIds.add(item.questionId);
        questions.push(item);

        // Stop if we have enough (in case Scan returned more than we need)
        if (questions.length >= limit) {
          break;
        }
      }
    }

    // If no more items to scan, check if we have enough
    if (!response.LastEvaluatedKey) {
      // If we still need more questions and we started with a random offset,
      // wrap around and scan from the beginning
      if (questions.length < limit && randomize && lastEvaluatedKey !== undefined) {
        lastEvaluatedKey = undefined; // Start from beginning
        randomize = false; // Don't randomize again to avoid infinite loop
        continue;
      }
      break;
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  }

  return questions;
}

/**
 * Efficiently fetch specific questions by their IDs using BatchGetItem
 * This is much more performant than scanning the entire table
 */
export async function getQuestionsByIds(questionIds: string[]): Promise<Question[]> {
  if (questionIds.length === 0) return [];

  // DynamoDB BatchGetItem has a limit of 100 items per request
  const batchSize = 100;
  const batches: string[][] = [];

  for (let i = 0; i < questionIds.length; i += batchSize) {
    batches.push(questionIds.slice(i, i + batchSize));
  }

  const allQuestions: Question[] = [];

  for (const batch of batches) {
    const command = new BatchGetCommand({
      RequestItems: {
        [TABLES.questionBank]: {
          Keys: batch.map(id => ({ questionId: id })),
        },
      },
    });

    const response = await docClient.send(command);
    const items = response.Responses?.[TABLES.questionBank] || [];
    allQuestions.push(...(items as Question[]));
  }

  return allQuestions;
}

export async function getAllCandidatePositions(): Promise<CandidatePosition[]> {
  const positions: CandidatePosition[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

  // Keep scanning until we have all positions
  do {
    const command: ScanCommand = new ScanCommand({
      TableName: TABLES.candidatePositions,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await docClient.send(command);
    const items = (response.Items || []) as CandidatePosition[];
    positions.push(...items);

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return positions;
}

export async function getCandidatePositions(candidateId: string): Promise<CandidatePosition[]> {
  const command = new QueryCommand({
    TableName: TABLES.candidatePositions,
    KeyConditionExpression: 'candidateId = :candidateId',
    ExpressionAttributeValues: {
      ':candidateId': candidateId,
    },
  });

  const response = await docClient.send(command);
  return (response.Items || []) as CandidatePosition[];
}

// Phase 6: Analytics & Aggregation

export interface MatchResult {
  resultId: string; // UUID
  timestamp: string; // ISO timestamp
  topCandidateId: string; // Top match candidate ID
  questionCount: number;
}

export interface AggregatedStats {
  statsId: string; // Shard ID (e.g., 'global-0' to 'global-99') or 'global-aggregated' for in-memory aggregated result
  totalMatches: number;
  totalQuestions: number; // Sum of all questions answered across all matches
  candidateStats: Record<string, number>; // candidateId → count
  lastUpdated: string; // ISO timestamp
}

export { TABLES };