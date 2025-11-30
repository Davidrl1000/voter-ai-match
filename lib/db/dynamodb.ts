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

export async function getQuestions(limit: number = 20): Promise<Question[]> {
  const command = new ScanCommand({
    TableName: TABLES.questionBank,
    Limit: limit,
  });

  const response = await docClient.send(command);
  return (response.Items || []) as Question[];
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
  const command = new ScanCommand({
    TableName: TABLES.candidatePositions,
  });

  const response = await docClient.send(command);
  return (response.Items || []) as CandidatePosition[];
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
