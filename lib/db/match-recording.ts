import { docClient, TABLES, type MatchResult } from '@/lib/db/dynamodb';
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Number of shards for distributing writes across the aggregated-stats table
// This prevents hot partition issues when handling millions of concurrent users
const SHARD_COUNT = 100;

/**
 * Get a random shard ID for write distribution
 * Uses random distribution to evenly spread writes across all shards
 */
function getRandomShardId(): string {
  const shardIndex = Math.floor(Math.random() * SHARD_COUNT);
  return `global-${shardIndex}`;
}

/**
 * Server-side utility to record a match result and update aggregated stats atomically.
 * This should ONLY be called from server components or server actions, never exposed as a public API.
 *
 * @param topCandidateId - The candidate ID that was the top match
 * @param questionCount - Number of questions answered in the quiz
 * @returns The resultId of the recorded match
 * @throws Error if recording fails
 */
export async function recordMatchResult(
  topCandidateId: string,
  questionCount: number
): Promise<string> {
  // Validate input
  if (!topCandidateId || typeof topCandidateId !== 'string') {
    throw new Error('topCandidateId is required and must be a string');
  }

  if (!questionCount || typeof questionCount !== 'number' || questionCount < 1) {
    throw new Error('questionCount is required and must be a positive number');
  }

  const resultId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    // 1. Store individual match result
    const matchResult: MatchResult = {
      resultId,
      timestamp,
      topCandidateId,
      questionCount,
    };

    await docClient.send(new PutCommand({
      TableName: TABLES.matchResults,
      Item: matchResult,
    }));

    // 2. Atomically update aggregated stats (sharded for scale)
    // Pick a random shard to distribute writes across 100 partitions
    const shardId = getRandomShardId();

    try {
      // Use ADD operation for atomic counters - idempotent and handles initialization
      await docClient.send(new UpdateCommand({
        TableName: TABLES.aggregatedStats,
        Key: { statsId: shardId },
        UpdateExpression:
          'ADD totalMatches :one, totalQuestions :questionCount, candidateStats.#candidateId :one SET lastUpdated = :timestamp',
        ExpressionAttributeNames: {
          '#candidateId': topCandidateId,
        },
        ExpressionAttributeValues: {
          ':one': 1,
          ':questionCount': questionCount,
          ':timestamp': timestamp,
        },
      }));
    } catch (error: unknown) {
      // If shard doesn't exist yet, initialize it
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationException') {
        // Initialize the shard with first values
        await docClient.send(new PutCommand({
          TableName: TABLES.aggregatedStats,
          Item: {
            statsId: shardId,
            totalMatches: 1,
            totalQuestions: questionCount,
            candidateStats: {
              [topCandidateId]: 1,
            },
            lastUpdated: timestamp,
          },
          ConditionExpression: 'attribute_not_exists(statsId)',
        })).catch(() => {
          // Ignore race condition - another request initialized it first
        });
      } else {
        // Re-throw unexpected errors
        throw error;
      }
    }

    return resultId;
  } catch (error) {
    console.error('Error recording match result:', error);
    throw new Error('Failed to record match result');
  }
}
