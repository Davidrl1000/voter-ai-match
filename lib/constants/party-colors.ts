/**
 * Party colors based on official party branding
 * Extracted from party logos in /public/assets/logos/
 */
export const PARTY_COLORS: Record<string, string> = {
  ACRM: '#2D4A6E',    // Dark navy blue (Aquí Costa Rica Manda)
  CAC: '#1D8A7E',     // Teal (Coalición Agenda Ciudadana)
  CDS: '#1565C0',     // Blue star (Centro Democrático y Social)
  CR1: '#E91E8C',     // Magenta/Pink (Costa Rica Primero)
  FA: '#FFE600',      // Yellow (Frente Amplio)
  PA: '#2E3A8C',      // Navy blue (Partido Avanza)
  PDLCT: '#E32636',   // Red (Partido de la Clase Trabajadora)
  PEL: '#1A1F4E',     // Dark navy (Esperanza y Libertad)
  PEN: '#0077B6',     // Blue clover (Esperanza Nacional)
  PIN: '#0077B6',     // Blue (Integración Nacional)
  PJSC: '#F7941D',    // Orange (Justicia Social)
  PLN: '#00A84F',     // Green (Liberación Nacional)
  PLP: '#F26522',     // Orange (Liberal Progresista)
  PNG: '#0077B6',     // Blue (Nueva Generación)
  PNR: '#5DADE2',     // Light blue (Nueva República)
  PPSD: '#4CAF50',    // Green (Progreso Social Democrático)
  PPSO: '#00ACC1',    // Teal/Cyan (Pueblo Soberano)
  PUCD: '#8E44AD',    // Purple (Unión Costarricense Democrática)
  PUSC: '#E53935',    // Red (Unidad Social Cristiana)
  UP: '#7B1FA2',      // Purple (Unidos Podemos)
};

/**
 * Fallback color for unknown parties
 */
export const DEFAULT_PARTY_COLOR = '#6B7280';

/**
 * Get the color for a party, falling back to default if not found
 */
export function getPartyColor(partyId: string): string {
  return PARTY_COLORS[partyId] || DEFAULT_PARTY_COLOR;
}
