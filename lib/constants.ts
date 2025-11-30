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
    MIN: 1,
    MAX: 100,
    DEFAULT: 20,
  },
  ANSWERS: {
    MAX: 100,
  },
  MATCHES: {
    DEFAULT_RETURN: 10,
  },
} as const;

/**
 * OpenAI model configuration
 */
export const OPENAI_MODELS = {
  EXPLANATION: 'gpt-4o-mini',
  EMBEDDING: 'text-embedding-3-small',
} as const;
