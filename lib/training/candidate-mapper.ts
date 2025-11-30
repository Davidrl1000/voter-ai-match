/**
 * Candidate Data Mapper
 * Transforms raw candidate data from data/candidates.json into the format
 * expected by the training script.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Raw candidate structure from data/candidates.json
 */
export interface RawCandidate {
  candidate: string;      // Photo filename (e.g., "candidate-1.png")
  logo: string;          // Logo filename (e.g., "logo-1.png")
  name: string;          // Full name (e.g., "José María Figueres")
  plan: string;          // PDF filename (e.g., "plan-1.pdf")
  politicalParty: string; // Party name (e.g., "Partido Liberación Nacional")
  site: string;          // Website URL
}

/**
 * Transformed candidate structure for training
 */
export interface Candidate {
  candidateId: string;    // Unique identifier (based on party name)
  name: string;           // Full name
  party: string;          // Political party name
  pdfPath: string;        // Absolute path to PDF file
  photoPath: string;      // Path to candidate photo
  logoPath: string;       // Path to party logo
  website: string;        // Campaign website
  metadata: {
    sourceFile: string;   // Original JSON source
    processingDate?: string;
  };
}

/**
 * Generate a candidate ID from party name
 * Creates a URL-safe identifier from the party name
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
 * Transform raw candidate data into training format
 */
export function mapCandidateData(rawCandidate: RawCandidate): Candidate {
  const candidateId = generateCandidateId(rawCandidate.politicalParty);

  return {
    candidateId,
    name: rawCandidate.name,
    party: rawCandidate.politicalParty,
    pdfPath: join(process.cwd(), 'public', 'assets', 'docs', rawCandidate.plan),
    photoPath: `/assets/photos/${rawCandidate.candidate}`,
    logoPath: `/assets/logos/${rawCandidate.logo}`,
    website: rawCandidate.site,
    metadata: {
      sourceFile: 'data/candidates.json',
      processingDate: new Date().toISOString(),
    },
  };
}

/**
 * Load and transform all candidates from data/candidates.json
 */
export function loadCandidates(): Candidate[] {
  const candidatesPath = join(process.cwd(), 'data', 'candidates.json');

  try {
    const rawData = readFileSync(candidatesPath, 'utf-8');
    const rawCandidates: RawCandidate[] = JSON.parse(rawData);

    const candidates = rawCandidates.map(mapCandidateData);

    console.log(`✓ Loaded ${candidates.length} candidates from ${candidatesPath}`);

    return candidates;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load candidates: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Load a subset of candidates for testing
 * @param count - Number of candidates to load (default: 3)
 */
export function loadCandidatesForTesting(count: number = 3): Candidate[] {
  const allCandidates = loadCandidates();
  const testCandidates = allCandidates.slice(0, count);

  console.log(`✓ Loaded ${testCandidates.length} candidates for testing (dry run mode)`);

  return testCandidates;
}

/**
 * Validate that a candidate has all required files
 */
export function validateCandidate(candidate: Candidate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');

  // Check PDF exists
  if (!fs.existsSync(candidate.pdfPath)) {
    errors.push(`PDF not found: ${candidate.pdfPath}`);
  }

  // Validate required fields
  if (!candidate.name || candidate.name.trim().length === 0) {
    errors.push('Candidate name is required');
  }

  if (!candidate.party || candidate.party.trim().length === 0) {
    errors.push('Political party is required');
  }

  if (!candidate.candidateId || candidate.candidateId.trim().length === 0) {
    errors.push('Candidate ID is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all candidates and report issues
 */
export function validateAllCandidates(candidates: Candidate[]): {
  valid: boolean;
  results: Array<{
    candidate: string;
    valid: boolean;
    errors: string[];
  }>;
} {
  const results = candidates.map(candidate => ({
    candidate: candidate.name,
    ...validateCandidate(candidate),
  }));

  const allValid = results.every(r => r.valid);

  if (!allValid) {
    console.error('\n⚠️  Validation errors found:');
    results
      .filter(r => !r.valid)
      .forEach(r => {
        console.error(`\n  ${r.candidate}:`);
        r.errors.forEach(err => console.error(`    - ${err}`));
      });
  } else {
    console.log(`✓ All ${candidates.length} candidates validated successfully`);
  }

  return {
    valid: allValid,
    results,
  };
}

/**
 * Get candidate by ID
 */
export function getCandidateById(
  candidates: Candidate[],
  candidateId: string
): Candidate | undefined {
  return candidates.find(c => c.candidateId === candidateId);
}

/**
 * Get candidate by party name
 */
export function getCandidateByParty(
  candidates: Candidate[],
  partyName: string
): Candidate | undefined {
  return candidates.find(
    c => c.party.toLowerCase() === partyName.toLowerCase()
  );
}
