import { NextResponse } from 'next/server';
import { fetchAggregatedStats, formatStatsResponse } from '@/lib/db/aggregated-stats';

/**
 * Minimal aggregated stats endpoint - returns only non-identifying information.
 * Intentionally excludes candidate identification to prevent data exposure before election day.
 * This endpoint will be updated closer to election day to include more details.
 *
 * Uses sharded reads across 100 partitions for scalability.
 */
export async function GET() {
  try {
    const stats = await fetchAggregatedStats();
    const response = formatStatsResponse(stats);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching aggregated stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aggregated statistics' },
      { status: 500 }
    );
  }
}
