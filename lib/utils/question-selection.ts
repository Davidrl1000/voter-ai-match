import type { Question } from '@/lib/db/dynamodb';
import { POLICY_AREAS, type PolicyArea } from '@/lib/constants';
import { shuffle } from '@/lib/utils/array-utils';

/**
 * Select random questions ensuring diversity across policy areas
 * Guarantees at least 1 question per policy area (up to count limit), then fills remaining with random selection
 *
 * Algorithm:
 * 1. Pick 1 random question from each policy area (ensures diversity, respects count limit)
 * 2. Fill remaining slots with random questions from all areas
 * 3. Shuffle final selection so policy areas aren't grouped together
 *
 * @param allQuestions - Pool of questions to select from
 * @param count - Number of questions to select
 * @returns Array of randomly selected questions with policy area diversity (always returns exactly count or fewer)
 */
export function selectRandomQuestions(allQuestions: Question[], count: number): Question[] {
  // Group questions by policy area
  const questionsByArea = new Map<PolicyArea, Question[]>();
  for (const area of POLICY_AREAS) {
    questionsByArea.set(area, []);
  }

  for (const question of allQuestions) {
    const areaQuestions = questionsByArea.get(question.policyArea as PolicyArea);
    if (areaQuestions) {
      areaQuestions.push(question);
    }
  }

  const selected: Question[] = [];

  // Step 1: Select at least 1 random question from each policy area, up to count limit
  const areasWithQuestions = [...questionsByArea.entries()].filter(([, qs]) => qs.length > 0);
  const shuffledAreas = shuffle(areasWithQuestions);

  for (const [, questions] of shuffledAreas) {
    if (selected.length >= count) break;
    if (questions.length > 0) {
      const randomIndex = Math.floor(Math.random() * questions.length);
      selected.push(questions[randomIndex]);
      // Remove selected question to avoid duplicates in step 2
      questions.splice(randomIndex, 1);
    }
  }

  // If we have enough questions, we're done but still need to shuffle and slice
  if (selected.length >= count) {
    return shuffle(selected.slice(0, count));
  }

  // Step 2: Fill remaining slots with random questions from all areas
  const remaining = count - selected.length;
  if (remaining > 0) {
    // Flatten remaining questions
    const remainingQuestions: Question[] = [];
    for (const questions of questionsByArea.values()) {
      remainingQuestions.push(...questions);
    }

    // Shuffle and take what we need
    const shuffled = shuffle(remainingQuestions);
    selected.push(...shuffled.slice(0, remaining));
  }

  // Step 3: Shuffle final selection so policy areas aren't grouped
  return shuffle(selected);
}
