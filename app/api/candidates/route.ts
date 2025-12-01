import { NextResponse } from 'next/server';
import { getAllCandidatePositions } from '@/lib/db/dynamodb';
import { logProgress } from '@/lib/training/utils';

export async function GET() {
  try {
    logProgress('Fetching all candidates');

    const positions = await getAllCandidatePositions();

    // Get unique candidates
    const candidatesMap = new Map();
    for (const position of positions) {
      if (!candidatesMap.has(position.candidateId)) {
        candidatesMap.set(position.candidateId, {
          candidateId: position.candidateId,
          name: position.name,
          party: position.party,
        });
      }
    }

    const candidates = Array.from(candidatesMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    logProgress('Candidates fetched', { count: candidates.length });

    return NextResponse.json({ candidates });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logProgress('Error fetching candidates', { error: errorMessage });
    return NextResponse.json(
      { error: 'Failed to fetch candidates' },
      { status: 500 }
    );
  }
}
