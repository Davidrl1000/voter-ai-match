import { NextResponse } from 'next/server';
import { docClient, TABLES, type AggregatedStats } from '@/lib/db/dynamodb';
import { BatchGetCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Minimal aggregated stats endpoint - returns only non-identifying information.
 * Intentionally excludes candidate identification to prevent data exposure before election day.
 * This endpoint will be updated closer to election day to include more details.
 *
 * Uses sharded reads across 100 partitions for scalability.
 */

const SHARD_COUNT = 100;
const CACHE_TTL_MS = 30000; // 30 seconds cache

// In-memory cache to reduce DynamoDB reads
let cachedStats: { data: AggregatedStats; timestamp: number } | null = null;

interface StatsResponse {
  totalMatches: number;
  averageQuestions: number;
  topResults: Array<{
    rank: number;
    percentage: number;
    count: number;
  }>;
}

/**
 * Fetch all shards and aggregate the results (with caching)
 */
async function fetchAggregatedStats(): Promise<AggregatedStats> {
  // Check cache first
  if (cachedStats && Date.now() - cachedStats.timestamp < CACHE_TTL_MS) {
    return cachedStats.data;
  }
  // Generate all shard keys
  const shardKeys = Array.from({ length: SHARD_COUNT }, (_, i) => ({
    statsId: `global-${i}`,
  }));

  // Fetch all shards in a single batch request
  const batchResponse = await docClient.send(new BatchGetCommand({
    RequestItems: {
      [TABLES.aggregatedStats]: {
        Keys: shardKeys,
      },
    },
  }));

  const shards = (batchResponse.Responses?.[TABLES.aggregatedStats] || []) as AggregatedStats[];

  // Aggregate across all shards
  const aggregated: AggregatedStats = {
    statsId: 'global-aggregated',
    totalMatches: 0,
    totalQuestions: 0,
    candidateStats: {},
    lastUpdated: new Date().toISOString(),
  };

  for (const shard of shards) {
    if (!shard) continue;

    aggregated.totalMatches += shard.totalMatches || 0;
    aggregated.totalQuestions += shard.totalQuestions || 0;

    // Merge candidateStats
    for (const [candidateId, count] of Object.entries(shard.candidateStats || {})) {
      aggregated.candidateStats[candidateId] = (aggregated.candidateStats[candidateId] || 0) + count;
    }

    // Keep the most recent lastUpdated
    if (shard.lastUpdated > aggregated.lastUpdated) {
      aggregated.lastUpdated = shard.lastUpdated;
    }
  }

  // Update cache
  cachedStats = {
    data: aggregated,
    timestamp: Date.now(),
  };

  return aggregated;
}

export async function GET() {
  try {
    const stats = await fetchAggregatedStats();

    if (stats.totalMatches === 0) {
      return NextResponse.json({
        totalMatches: 0,
        averageQuestions: 0,
        topResults: [],
      });
    }

    // Calculate average questions answered
    const averageQuestions = stats.totalMatches > 0
      ? Math.round((stats.totalQuestions / stats.totalMatches) * 10) / 10
      : 0;

    // Convert to sorted array and return only top 3 with minimal info
    const topResults = Object.entries(stats.candidateStats)
      .map(([, count]) => count)
      .sort((a, b) => b - a)
      .slice(0, 3)
      .map((count, index) => ({
        rank: index + 1,
        percentage: Math.round((count / stats.totalMatches) * 1000) / 10,
        count,
      }));

    const response: StatsResponse = {
      totalMatches: stats.totalMatches,
      averageQuestions,
      topResults,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching aggregated stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aggregated statistics' },
      { status: 500 }
    );
  }
}
