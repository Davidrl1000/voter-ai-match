import type { Question, CandidatePosition } from '@/lib/db/dynamodb';
import { cosineSimilarity } from '@/lib/training/utils';

export interface UserAnswer {
  questionId: string;
  answer: number | string;
  policyArea: string;
  questionEmbedding: number[];
}

export interface CandidateMatch {
  candidateId: string;
  name: string;
  party: string;
  score: number;
  matchedPositions: number;
  alignmentByArea: Record<string, number>;
}

/**
 * Normalize user answer to 0-1 scale for matching
 *
 * ERROR HANDLING: Invalid inputs return 0.5 (neutral) to prevent bias and gaming.
 * Agreement-scale: 1-5 → 0.0-1.0 | Specific-choice: Maps options linearly to 0-1
 *
 * @param answer - User's answer (number for agreement-scale, string for specific-choice)
 * @param question - Question metadata with type and options
 * @returns Normalized value 0-1, or 0.5 for invalid input
 */
function normalizeAnswer(answer: number | string, question: Question): number {
  if (question.type === 'agreement-scale') {
    const numericAnswer = Number(answer);
    if (isNaN(numericAnswer) || numericAnswer < 1 || numericAnswer > 5) {
      console.warn(`Invalid agreement-scale answer: ${answer}. Using neutral 0.5`);
      return 0.5;
    }
    // Map 1-5 scale to 0-1: 1→0.0, 2→0.25, 3→0.5, 4→0.75, 5→1.0
    return (numericAnswer - 1) / 4;
  }

  if (question.type === 'specific-choice') {
    if (!question.options || question.options.length === 0) {
      console.warn(`Missing options for specific-choice question: ${question.questionId}`);
      return 0.5;
    }

    const optionIndex = question.options.indexOf(String(answer));
    if (optionIndex === -1) {
      console.warn(`Answer "${answer}" not found in options for question ${question.questionId}`);
      return 0.5;
    }

    return question.options.length === 1 ? 1.0 : optionIndex / (question.options.length - 1);
  }

  console.warn(`Unknown question type: ${question.type}. Using neutral 0.5`);
  return 0.5;
}

/**
 * Calculate candidate matches using rank-based scoring with jitter for fairness
 *
 * Algorithm:
 * 1. Z-score normalize candidate similarities (remove baseline bias)
 * 2. Calculate alignment scores using cosine similarity
 * 3. Add 10% random jitter to prevent systematic embedding advantages
 * 4. Rank candidates and convert to points (1st=100, last=0, linear scale)
 * 5. Average points across questions for final score
 *
 * Fairness metrics: CV ~29-46%, 100% coverage, excellent rotation across quizzes
 * See docs/CHANGELOG.md for detailed explanation
 */
export function calculateMatches(
  userAnswers: UserAnswer[],
  candidatePositions: CandidatePosition[],
  questions: Question[]
): CandidateMatch[] {
  // Validate inputs
  if (!userAnswers || userAnswers.length === 0) {
    console.warn('No user answers provided for matching');
    return [];
  }

  if (!candidatePositions || candidatePositions.length === 0) {
    console.warn('No candidate positions provided for matching');
    return [];
  }

  if (!questions || questions.length === 0) {
    console.warn('No questions provided for matching');
    return [];
  }

  // STEP 1: Create efficient lookup maps
  const questionMap = new Map(questions.map(q => [q.questionId, q]));
  const positionsByCandidate = new Map<string, Map<string, CandidatePosition>>();

  // Build lookup maps for efficient access
  for (const pos of candidatePositions) {
    // Map by candidate + policy area for O(1) lookup
    if (!positionsByCandidate.has(pos.candidateId)) {
      positionsByCandidate.set(pos.candidateId, new Map());
    }
    positionsByCandidate.get(pos.candidateId)!.set(pos.policyArea, pos);
  }

  // Get ALL unique candidates (to ensure 100% coverage)
  const allCandidates = Array.from(positionsByCandidate.keys()).map(candidateId => {
    // Get any position from this candidate to extract name and party
    const firstPosition = Array.from(positionsByCandidate.get(candidateId)!.values())[0];
    return {
      candidateId,
      name: firstPosition.name,
      party: firstPosition.party,
    };
  });

  // STEP 2: Calculate normalization statistics per candidate (Z-SCORE NORMALIZATION)
  // This removes systematic bias where some candidates have naturally higher cosine similarities
  const candidateStats = new Map<string, { mean: number; stdDev: number }>();

  for (const candidate of allCandidates) {
    const similarities: number[] = [];
    const candidatePositionsMap = positionsByCandidate.get(candidate.candidateId);

    // Collect all cosine similarities for this candidate across all questions
    for (const answer of userAnswers) {
      const position = candidatePositionsMap?.get(answer.policyArea);
      if (position && position.embedding) {
        const similarity = cosineSimilarity(answer.questionEmbedding, position.embedding);
        similarities.push(similarity);
      }
    }

    // Calculate mean and standard deviation
    if (similarities.length > 0) {
      const mean = similarities.reduce((sum, val) => sum + val, 0) / similarities.length;
      const squaredDiffs = similarities.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / similarities.length;
      const stdDev = Math.sqrt(variance);

      candidateStats.set(candidate.candidateId, {
        mean,
        stdDev: stdDev > 0 ? stdDev : 1, // Prevent division by zero
      });
    } else {
      // No positions for this candidate - use neutral stats
      candidateStats.set(candidate.candidateId, { mean: 0, stdDev: 1 });
    }
  }

  // STEP 3: Track candidate points and alignment by policy area
  const candidateData = new Map<string, {
    totalPoints: number;
    questionCount: number;
    alignmentByArea: Record<string, { points: number; count: number }>;
    name: string;
    party: string;
  }>();

  // Initialize all candidates
  for (const candidate of allCandidates) {
    candidateData.set(candidate.candidateId, {
      totalPoints: 0,
      questionCount: 0,
      alignmentByArea: {},
      name: candidate.name,
      party: candidate.party,
    });
  }

  // STEP 4: For each question, rank ALL candidates and assign points
  for (const answer of userAnswers) {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      console.warn(`Question not found for answer: ${answer.questionId}`);
      continue;
    }

    // Calculate alignment scores for ALL candidates for this question
    const candidateAlignments: Array<{
      candidateId: string;
      alignmentScore: number;
    }> = [];

    // Normalize user answer to 0-1 scale
    const normalizedAnswer = normalizeAnswer(answer.answer, question);
    const userStance = (normalizedAnswer - 0.5) * 2; // Convert to -1 to +1

    // CRITICAL: Rank ALL candidates for this question (ensures 100% coverage)
    for (const candidate of allCandidates) {
      // Check if candidate has a position for this policy area
      const candidatePositionsMap = positionsByCandidate.get(candidate.candidateId);
      const position = candidatePositionsMap?.get(answer.policyArea);

      let candidateStance: number;

      if (position && position.embedding) {
        // Candidate has a position - calculate semantic similarity
        const rawSimilarity = cosineSimilarity(answer.questionEmbedding, position.embedding);

        // Apply Z-score normalization to remove baseline bias
        const stats = candidateStats.get(candidate.candidateId)!;
        candidateStance = (rawSimilarity - stats.mean) / stats.stdDev;
      } else {
        // Candidate has NO position for this policy area - assign neutral stance
        candidateStance = 0;
      }

      // Directional alignment: do user and candidate stances align?
      // Same sign (both agree or both disagree) → high score
      // Opposite signs → low score
      let stanceAlignment = (candidateStance * userStance + 1) / 2; // normalize to 0-1

      // Add 10% jitter for fairness (reduces CV from ~100% to ~44%)
      const jitter = (Math.random() - 0.5) * 0.1; // Range: [-0.05, +0.05]
      stanceAlignment += jitter;

      candidateAlignments.push({
        candidateId: candidate.candidateId,
        alignmentScore: stanceAlignment,
      });
    }

    // STEP 5: Rank candidates by alignment score (highest first)
    candidateAlignments.sort((a, b) => b.alignmentScore - a.alignmentScore);

    // STEP 6: Convert ranks to points using LINEAR SCALE
    // 1st place = 100 points, last place = 0 points, linear in between
    const totalCandidates = candidateAlignments.length;
    const questionWeight = question.weight || 1;

    candidateAlignments.forEach((item, index) => {
      const data = candidateData.get(item.candidateId)!;

      // Calculate rank-based points (0-100)
      // Rank 0 (best) → 100 points, Rank N-1 (worst) → 0 points
      const rankPoints = totalCandidates > 1
        ? (100 * (totalCandidates - index - 1) / (totalCandidates - 1))
        : 100;

      // Apply question weight
      const weightedPoints = rankPoints * questionWeight;

      data.totalPoints += weightedPoints;
      data.questionCount++;

      // Track by policy area
      if (!data.alignmentByArea[answer.policyArea]) {
        data.alignmentByArea[answer.policyArea] = { points: 0, count: 0 };
      }
      data.alignmentByArea[answer.policyArea].points += weightedPoints;
      data.alignmentByArea[answer.policyArea].count++;
    });
  }

  // STEP 7: Convert accumulated points to final matches
  const matches: CandidateMatch[] = Array.from(candidateData.entries()).map(
    ([candidateId, data]) => {
      // Calculate average points by policy area (for display purposes)
      const alignmentByArea: Record<string, number> = {};
      for (const [area, { points, count }] of Object.entries(data.alignmentByArea)) {
        // Average points for this policy area
        alignmentByArea[area] = count > 0 ? points / count : 0;
      }

      // Calculate average points across all questions (this is the final score)
      const averageScore = data.questionCount > 0 ? data.totalPoints / data.questionCount : 0;

      return {
        candidateId,
        name: data.name,
        party: data.party,
        score: Math.min(100, Math.max(0, averageScore)), // Clamp to 0-100
        matchedPositions: data.questionCount,
        alignmentByArea,
      };
    }
  );

  // Sort by score descending (best matches first)
  return matches.sort((a, b) => b.score - a.score);
}
