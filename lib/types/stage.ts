/**
 * Application stage types
 */

export const Stage = {
  WELCOME: 'welcome',
  QUIZ: 'quiz',
  RESULTS: 'results',
} as const;

export type Stage = typeof Stage[keyof typeof Stage];
