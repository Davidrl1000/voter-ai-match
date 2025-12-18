/**
 * Session storage utilities for preserving quiz results
 */

import type { UserAnswer } from '@/lib/matching/algorithm';

interface CachedResults {
  answers: UserAnswer[];
  matches: Array<{
    candidateId: string;
    name: string;
    party: string;
    score: number;
    matchedPositions: number;
    alignmentByArea: Record<string, number>;
  }>;
  aiExplanation: string;
  timestamp: number;
}

const RESULTS_KEY = 'quiz_results';
const MAX_AGE = 1000 * 60 * 60; // 1 hour

/**
 * Save quiz results to session storage
 */
export function saveQuizResults(results: Omit<CachedResults, 'timestamp'>): void {
  try {
    const data: CachedResults = {
      ...results,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving quiz results:', error);
  }
}

/**
 * Load quiz results from session storage
 * Returns null if no results, expired, or answers don't match
 */
export function loadQuizResults(currentAnswers: UserAnswer[]): CachedResults | null {
  try {
    const stored = sessionStorage.getItem(RESULTS_KEY);
    if (!stored) return null;

    const data: CachedResults = JSON.parse(stored);

    // Check if expired
    if (Date.now() - data.timestamp > MAX_AGE) {
      clearQuizResults();
      return null;
    }

    // Check if answers match (same questions answered)
    if (!answersMatch(data.answers, currentAnswers)) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error loading quiz results:', error);
    return null;
  }
}

/**
 * Clear quiz results from session storage
 */
export function clearQuizResults(): void {
  try {
    sessionStorage.removeItem(RESULTS_KEY);
    sessionStorage.removeItem('navigated_to_candidates');
  } catch (error) {
    console.error('Error clearing quiz results:', error);
  }
}

/**
 * Mark that user navigated to candidates page (for back navigation detection)
 */
export function markNavigatedToCandidates(): void {
  try {
    sessionStorage.setItem('navigated_to_candidates', 'true');
  } catch (error) {
    console.error('Error marking navigation to candidates:', error);
  }
}

/**
 * Check if user navigated to candidates page
 */
export function hasNavigatedToCandidates(): boolean {
  try {
    return sessionStorage.getItem('navigated_to_candidates') === 'true';
  } catch (error) {
    console.error('Error checking navigation to candidates:', error);
    return false;
  }
}

/**
 * Check if two answer arrays match (same questions, same answers)
 */
function answersMatch(stored: UserAnswer[], current: UserAnswer[]): boolean {
  if (stored.length !== current.length) return false;

  return stored.every((storedAnswer, index) => {
    const currentAnswer = current[index];
    return (
      storedAnswer.questionId === currentAnswer.questionId &&
      storedAnswer.answer === currentAnswer.answer
    );
  });
}
