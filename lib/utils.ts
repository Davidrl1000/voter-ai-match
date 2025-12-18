/**
 * Shared utility functions
 */

/**
 * Convert party name to URL-safe slug for deep linking
 */
export function partyToSlug(party: string): string {
  return party
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}
