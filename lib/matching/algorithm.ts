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
    return numericAnswer / 5;
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
 * Calculate candidate matches using semantic embedding similarity
 *
 * Algorithm: Calculates cosine similarity between user answer embeddings and candidate
 * position embeddings, combines with normalized answers and question weights, then
 * aggregates to 0-100 scores. Returns candidates sorted by score (highest first).
 *
 * Error Handling: Invalid inputs return empty array or neutral values (0.5). All errors
 * are logged for monitoring. Deterministic and stateless for concurrent execution.
 *
 * @param userAnswers - User answers with 1536-dim embeddings from OpenAI
 * @param candidatePositions - Candidate positions with embeddings
 * @param questions - Question metadata (types, options, weights)
 * @returns Candidates sorted by match score (0-100)
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

  // Optimization: Create maps for efficient O(1) lookups
  const questionMap = new Map(questions.map(q => [q.questionId, q]));
  const positionsByArea = new Map<string, CandidatePosition[]>();
  for (const pos of candidatePositions) {
    if (!positionsByArea.has(pos.policyArea)) {
      positionsByArea.set(pos.policyArea, []);
    }
    positionsByArea.get(pos.policyArea)!.push(pos);
  }

  // Map for tracking candidate scores and metadata
  const candidateScores = new Map<string, {
    totalScore: number;
    matchedPositions: number;
    alignmentByArea: Record<string, { score: number; count: number }>;
    name: string;
    party: string;
  }>();

  // Calculate alignment scores for each user answer
  for (const answer of userAnswers) {
    // O(1) lookup
    const question = questionMap.get(answer.questionId);
    if (!question) {
      console.warn(`Question not found for answer: ${answer.questionId}`);
      continue;
    }

    // O(1) lookup
    const relevantPositions = positionsByArea.get(answer.policyArea) || [];

    if (relevantPositions.length === 0) {
      console.warn(`No candidate positions found for policy area: ${answer.policyArea}`);
    }

    // Compare user answer with each candidate's position
    for (const position of relevantPositions) {
      // Initialize candidate data if first encounter
      if (!candidateScores.has(position.candidateId)) {
        candidateScores.set(position.candidateId, {
          totalScore: 0,
          matchedPositions: 0,
          alignmentByArea: {},
          name: position.name,
          party: position.party,
        });
      }

      const candidateData = candidateScores.get(position.candidateId)!;

      // Calculate semantic similarity between embeddings
      const similarity = cosineSimilarity(answer.questionEmbedding, position.embedding);

      // Normalize user answer to 0-1 scale
      const normalizedAnswer = normalizeAnswer(answer.answer, question);

      // Calculate weighted alignment score
      const questionWeight = question.weight || 1;
      const alignmentScore = similarity * normalizedAnswer * questionWeight;

      // Aggregate scores
      candidateData.totalScore += alignmentScore;
      candidateData.matchedPositions++;

      // Track alignment by policy area
      if (!candidateData.alignmentByArea[answer.policyArea]) {
        candidateData.alignmentByArea[answer.policyArea] = { score: 0, count: 0 };
      }
      candidateData.alignmentByArea[answer.policyArea].score += alignmentScore;
      candidateData.alignmentByArea[answer.policyArea].count++;
    }
  }

  // Convert scores map to sorted array of matches
  const matches: CandidateMatch[] = Array.from(candidateScores.entries()).map(
    ([candidateId, data]) => {
      // Calculate average alignment percentage by policy area
      const alignmentByArea: Record<string, number> = {};
      for (const [area, { score, count }] of Object.entries(data.alignmentByArea)) {
        // Convert to percentage (0-100)
        alignmentByArea[area] = count > 0 ? (score / count) * 100 : 0;
      }

      // Normalize total score to 0-100 percentage
      const maxPossibleScore = userAnswers.length;
      const normalizedScore = maxPossibleScore > 0 ? (data.totalScore / maxPossibleScore) * 100 : 0;

      return {
        candidateId,
        name: data.name,
        party: data.party,
        score: Math.min(100, Math.max(0, normalizedScore)), // Clamp to 0-100
        matchedPositions: data.matchedPositions,
        alignmentByArea,
      };
    }
  );

  // Sort by score descending (best matches first)
  return matches.sort((a, b) => b.score - a.score);
}
