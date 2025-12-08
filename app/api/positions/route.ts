import { NextResponse } from 'next/server';
import { getCandidatePositionsByParty } from '@/lib/db/dynamodb';

/**
 * GET /api/positions?party={partyName}
 * Fetches all 7 policy positions for a given party from DynamoDB
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const partyName = searchParams.get('party');

    if (!partyName) {
      return NextResponse.json(
        { error: 'Party name is required' },
        { status: 400 }
      );
    }

    // Get positions using party name (candidateId generated internally)
    const positions = await getCandidatePositionsByParty(partyName);

    return NextResponse.json({
      partyName,
      positions,
    });
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}
