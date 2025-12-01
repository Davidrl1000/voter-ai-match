/**
 * Candidate Assets Mapper
 * Maps candidate/party names to their photo and logo filenames
 * Source of truth: data/candidates.json
 */

import candidatesData from '@/data/candidates.json';

interface CandidateAsset {
  name: string;
  party: string;
  photo: string;
  logo: string;
}

// Build lookup maps on module load
const assetsByParty = new Map<string, CandidateAsset>();
const assetsByName = new Map<string, CandidateAsset>();

candidatesData.forEach((candidate) => {
  const asset: CandidateAsset = {
    name: candidate.name,
    party: candidate.politicalParty,
    photo: candidate.candidate,
    logo: candidate.logo,
  };

  // Normalize keys for case-insensitive lookup
  assetsByParty.set(candidate.politicalParty.toLowerCase(), asset);
  assetsByName.set(candidate.name.toLowerCase(), asset);
});

/**
 * Get photo and logo filenames for a candidate by party name
 */
export function getAssetsByParty(partyName: string): CandidateAsset | null {
  return assetsByParty.get(partyName.toLowerCase()) || null;
}

/**
 * Get photo and logo filenames for a candidate by name
 */
export function getAssetsByName(candidateName: string): CandidateAsset | null {
  return assetsByName.get(candidateName.toLowerCase()) || null;
}

/**
 * Get photo path for a candidate by party name
 */
export function getPhotoPath(partyName: string): string {
  const assets = getAssetsByParty(partyName);
  return assets ? `/assets/photos/${assets.photo}` : '/assets/photos/placeholder.jpg';
}

/**
 * Get logo path for a candidate by party name
 */
export function getLogoPath(partyName: string): string {
  const assets = getAssetsByParty(partyName);
  return assets ? `/assets/logos/${assets.logo}` : '/assets/logos/placeholder.jpg';
}
