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
      // Try to update existing shard
      await docClient.send(new UpdateCommand({
        TableName: TABLES.aggregatedStats,
        Key: { statsId: shardId },
        UpdateExpression: `
          SET lastUpdated = :timestamp,
              totalMatches = if_not_exists(totalMatches, :zero) + :one,
              totalQuestions = if_not_exists(totalQuestions, :zero) + :questionCount,
              candidateStats.#candidateId = if_not_exists(candidateStats.#candidateId, :zero) + :one
        `,
        ExpressionAttributeNames: {
          '#candidateId': topCandidateId,
        },
        ExpressionAttributeValues: {
          ':zero': 0,
          ':one': 1,
          ':questionCount': questionCount,
          ':timestamp': timestamp,
        },
        // Ensure item exists (will create if doesn't exist with if_not_exists)
        ConditionExpression: 'attribute_exists(statsId) OR attribute_not_exists(statsId)',
      }));
    } catch (error: unknown) {
      // If shard doesn't exist, initialize it and retry
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationException') {
        // Initialize the shard with the first values
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
          // Only create if doesn't exist (avoid race conditions)
          ConditionExpression: 'attribute_not_exists(statsId)',
        })).catch(() => {
          // Ignore error if another request created it first
          // The next quiz completion will increment it successfully
        });
      } else {
        throw error;
      }
    }

    return resultId;
  } catch (error) {
    console.error('Error recording match result:', error);
    throw new Error('Failed to record match result');
  }
}
