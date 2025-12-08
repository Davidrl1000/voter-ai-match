/**
 * Shared constants for the voter matching system
 * Centralized location for policy areas, labels, and configuration values
 */

/**
 * Valid policy areas used throughout the system
 */
export const POLICY_AREAS = [
  'economy',
  'healthcare',
  'education',
  'security',
  'environment',
  'social',
  'infrastructure'
] as const;

export type PolicyArea = typeof POLICY_AREAS[number];

/**
 * Spanish labels for policy areas (used in UI)
 */
export const POLICY_AREA_LABELS: Record<string, string> = {
  economy: 'Economía',
  healthcare: 'Salud',
  education: 'Educación',
  security: 'Seguridad',
  environment: 'Medio Ambiente',
  social: 'Políticas Sociales',
  infrastructure: 'Infraestructura',
};

/**
 * Question types supported by the system
 */
export const QUESTION_TYPES = ['agreement-scale', 'specific-choice'] as const;

export type QuestionType = typeof QUESTION_TYPES[number];

/**
 * Agreement scale range (1-5)
 */
export const AGREEMENT_SCALE = {
  MIN: 1,
  MAX: 5,
} as const;

/**
 * API limits and defaults
 */
export const API_LIMITS = {
  QUESTIONS: {
    ALLOWED_COUNTS: [15, 20, 30] as const,  // Fixed options for question counts
    DEFAULT: 20,  // Standard option
  },
  ANSWERS: {
    MAX: 420,  // Match questions max
  },
  MATCHES: {
    DEFAULT_RETURN: 10,
  },
} as const;

/**
 * Question count options with labels and time estimates
 * 35-point comprehensive bonus ensures 100% candidate coverage for all counts
 */
export const QUESTION_OPTIONS = [
  { count: 15, label: 'Rápido', description: '~3 min', icon: 'zap' },
  { count: 20, label: 'Estándar', description: '~5 min', icon: 'check-circle' },
  { count: 30, label: 'Completo', description: '~8 min', icon: 'target' },
] as const;

/**
 * OpenAI model configuration
 */
export const OPENAI_MODELS = {
  EXPLANATION: 'gpt-4o-mini',
  EMBEDDING: 'text-embedding-3-small',
} as const;
