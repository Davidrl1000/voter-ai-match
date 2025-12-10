import { POLICY_AREAS } from '@/lib/constants';
import type { UserAnswer } from '@/lib/matching/algorithm';

const VALID_POLICY_AREAS = POLICY_AREAS as readonly string[];

/**
 * Validate a user answer object
 * Ensures all required fields are present and have valid types
 *
 * @param answer - The user answer to validate
 * @returns true if valid, false otherwise
 */
export function validateUserAnswer(answer: UserAnswer): boolean {
  if (!answer || typeof answer !== 'object') return false;
  if (!answer.questionId || typeof answer.questionId !== 'string') return false;
  if (answer.answer === undefined || answer.answer === null) return false;
  if (!answer.policyArea || !VALID_POLICY_AREAS.includes(answer.policyArea)) return false;
  if (!Array.isArray(answer.questionEmbedding) || answer.questionEmbedding.length === 0) return false;
  if (!answer.questionEmbedding.every(val => typeof val === 'number' && !isNaN(val))) return false;

  return true;
}
