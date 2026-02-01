import { NextResponse } from 'next/server';
import { fetchAggregatedStats } from '@/lib/db/aggregated-stats';
import { getPartyColor } from '@/lib/constants/party-colors';
import electionConfig from '@/data/election-results.json';
import candidatesData from '@/data/candidates.json';

interface Candidate {
  candidate: string;
  logo: string;
  name: string;
  politicalParty: string;
}

interface ElectionResultsResponse {
  showNationalResults: boolean;
  totalParticipants: number;
  lastUpdated: string;
  results: Array<{
    candidateId: string;
    name: string;
    party: string;
    partyColor: string;
    sitePercentage: number;
    nationalPercentage: number | null;
  }>;
}

/**
 * Extract short party code from logo filename (e.g., "PLN.jpg" -> "PLN")
 * Used for party colors and national results JSON
 */
function extractPartyCode(candidate: Candidate): string {
  return candidate.logo.replace(/\.(jpg|png|jpeg|webp)$/i, '');
}

/**
 * Generate candidate ID from party name (same logic as training script)
 * This must match the ID format used in DynamoDB
 */
function generateCandidateId(partyName: string): string {
  return partyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')      // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');         // Remove leading/trailing hyphens
}

/**
 * GET /api/election-results
 * Returns election results comparison data between site quiz results and national results
 */
export async function GET() {
  try {
    // Fetch aggregated stats from DynamoDB
    const stats = await fetchAggregatedStats();
    const totalMatches = stats.totalMatches;

    // Build results array
    const results: ElectionResultsResponse['results'] = [];

    // Process all candidates from the candidates.json file
    for (const candidate of candidatesData as Candidate[]) {
      // Short code (e.g., "PLN") - used for colors and national results JSON
      const partyCode = extractPartyCode(candidate);
      // Full ID (e.g., "partido-liberacion-nacional") - used for DynamoDB lookup
      const dbCandidateId = generateCandidateId(candidate.politicalParty);

      // Get site stats for this candidate using the DB candidate ID
      const siteCount = stats.candidateStats[dbCandidateId] || 0;
      const sitePercentage = totalMatches > 0
        ? Math.round((siteCount / totalMatches) * 1000) / 10
        : 0;

      // Get national results if enabled (using short party code)
      const nationalPercentage = electionConfig.showNationalResults
        ? (electionConfig.nationalResults as Record<string, number>)[partyCode] ?? null
        : null;

      results.push({
        candidateId: partyCode,
        name: candidate.name,
        party: candidate.politicalParty,
        partyColor: getPartyColor(partyCode),
        sitePercentage,
        nationalPercentage,
      });
    }

    // Sort by site percentage (descending)
    results.sort((a, b) => b.sitePercentage - a.sitePercentage);

    const response: ElectionResultsResponse = {
      showNationalResults: electionConfig.showNationalResults,
      totalParticipants: totalMatches,
      lastUpdated: stats.lastUpdated,
      results,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching election results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch election results' },
      { status: 500 }
    );
  }
}
