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
 * Normalize user answer to a 0-1 scale for matching
 * @param answer - User's answer (number for agreement-scale, string for specific-choice)
 * @param question - Question metadata
 * @returns Normalized value between 0 and 1
 */
function normalizeAnswer(answer: number | string, question: Question): number {
  if (question.type === 'agreement-scale') {
    const numericAnswer = Number(answer);
    // Agreement scale: 1-5 -> 0.0-1.0
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

    // Normalize to 0-1 range
    return question.options.length === 1 ? 1.0 : optionIndex / (question.options.length - 1);
  }

  console.warn(`Unknown question type: ${question.type}. Using neutral 0.5`);
  return 0.5;
}

/**
 * Calculate candidate matches based on user answers
 * Uses cosine similarity between answer embeddings and candidate position embeddings,
 * combined with normalized answer values and question weights
 *
 * @param userAnswers - Array of user's answers with embeddings
 * @param candidatePositions - Array of candidate positions with embeddings
 * @param questions - Array of questions for normalization metadata
 * @returns Sorted array of candidate matches with scores
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
    // Find corresponding question for normalization
    const question = questions.find(q => q.questionId === answer.questionId);
    if (!question) {
      console.warn(`Question not found for answer: ${answer.questionId}`);
      continue;
    }

    // Filter candidate positions matching the policy area
    const relevantPositions = candidatePositions.filter(
      pos => pos.policyArea === answer.policyArea
    );

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
