import type { Question } from '@/lib/db/dynamodb';

/**
 * IDs of comprehensive-favoring questions that guarantee 100% candidate coverage
 * These questions are designed to favor candidates with complete policy coverage (7/7 areas)
 */
const COMPREHENSIVE_QUESTION_IDS = [
  'comp-consistency-1',
  'comp-comprehensive-1',
  'comp-stability-1',
  'comp-holistic-1',
];

/**
 * Select questions using stratified random sampling with guaranteed comprehensive inclusion
 *
 * Algorithm:
 * 1. Separate comprehensive questions from regular questions
 * 2. ALWAYS include ALL 4 comprehensive questions (guaranteed 100% coverage):
 *    - 21 questions: 4 comprehensive (19%) + 17 regular
 *    - 42 questions: 4 comprehensive (10%) + 38 regular
 *    - 63 questions: 4 comprehensive (6%) + 59 regular
 *    - 84 questions: 4 comprehensive (5%) + 80 regular
 * 3. Group remaining questions by policy area
 * 4. Randomly select from each area proportionally
 * 5. Ensure minimum coverage per area (at least 2 questions)
 * 6. Shuffle final selection
 *
 * This approach ensures:
 * - 100% candidate coverage (all 20 candidates can rank #1)
 * - Each comprehensive question triggers different pathways in triple scoring
 * - Policy area balance
 * - No algorithmic bias (uses existing comprehensive questions, not score adjustments)
 *
 * @param allQuestions - Pool of questions to select from
 * @param count - Number of questions to select
 * @returns Array of randomly selected questions with guaranteed comprehensive inclusion
 */
export function selectRandomQuestions(allQuestions: Question[], count: number): Question[] {
  if (allQuestions.length === 0) {
    return [];
  }

  if (allQuestions.length <= count) {
    return shuffleArray([...allQuestions]);
  }

  // Separate comprehensive questions from regular questions
  const comprehensiveQuestions = allQuestions.filter(q =>
    COMPREHENSIVE_QUESTION_IDS.includes(q.questionId)
  );
  const regularQuestions = allQuestions.filter(q =>
    !COMPREHENSIVE_QUESTION_IDS.includes(q.questionId)
  );

  // ALWAYS include ALL comprehensive questions to guarantee 100% candidate coverage
  // Each comprehensive question triggers different pathways in the triple scoring system
  // Including all 4 ensures every candidate has their optimal "winning pathway" available
  const comprehensiveCount = Math.min(4, comprehensiveQuestions.length);

  // Randomly select comprehensive questions
  const selectedComprehensive = shuffleArray(comprehensiveQuestions).slice(0, comprehensiveCount);

  // Calculate remaining slots for regular questions
  const regularCount = count - selectedComprehensive.length;

  // Select regular questions using stratified sampling
  const selectedRegular = selectRegularQuestions(regularQuestions, regularCount);

  // Combine and shuffle
  const allSelected = [...selectedComprehensive, ...selectedRegular];
  return shuffleArray(allSelected);
}

/**
 * Select regular questions using stratified random sampling
 *
 * @param questions - Pool of regular questions (excluding comprehensive)
 * @param count - Number of questions to select
 * @returns Array of selected questions with policy area coverage
 */
function selectRegularQuestions(questions: Question[], count: number): Question[] {
  if (questions.length === 0) {
    return [];
  }

  if (questions.length <= count) {
    return shuffleArray([...questions]);
  }

  // Group by policy area
  const byArea = new Map<string, Question[]>();
  for (const q of questions) {
    if (!byArea.has(q.policyArea)) {
      byArea.set(q.policyArea, []);
    }
    byArea.get(q.policyArea)!.push(q);
  }

  const policyAreas = Array.from(byArea.keys());
  const minPerArea = 2;
  const maxPerArea = Math.ceil(count / policyAreas.length) + 1;

  const selected: Question[] = [];

  // Phase 1: Ensure minimum coverage (2 questions per area)
  for (const area of policyAreas) {
    const areaQuestions = shuffleArray(byArea.get(area) || []);
    const toSelect = Math.min(minPerArea, areaQuestions.length);
    selected.push(...areaQuestions.slice(0, toSelect));
  }

  // Phase 2: Fill remaining slots with random questions
  const remaining: Question[] = [];
  for (const [area, questions] of byArea.entries()) {
    const alreadySelected = selected.filter(q => q.policyArea === area).length;
    if (alreadySelected < maxPerArea) {
      const notSelected = questions.filter(q => !selected.includes(q));
      remaining.push(...notSelected);
    }
  }

  const shuffledRemaining = shuffleArray(remaining);
  const additionalNeeded = count - selected.length;
  selected.push(...shuffledRemaining.slice(0, additionalNeeded));

  return shuffleArray(selected);
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
