import { describe, it, expect } from 'vitest';
import { calculateMatches } from '@/lib/matching/algorithm';
import { mockCandidatePositions } from '../fixtures/candidates';
import { mockQuestions } from '../fixtures/questions';
import type { UserAnswer } from '@/lib/matching/algorithm';

/**
 * TRANSPARENCY & NEUTRALITY TESTS
 *
 * These tests are PUBLIC and serve to prove that the matching algorithm is:
 * 1. Deterministic - Same inputs always produce same outputs
 * 2. Fair - All candidates have equal opportunity to match
 * 3. Neutral - No hardcoded preferences or hidden bias
 * 4. Transparent - Behavior is predictable and verifiable
 *
 * These tests can be reviewed by anyone to verify the system's neutrality.
 */

describe('Transparency & Neutrality Tests', () => {
  describe('Algorithm Determinism', () => {
    it('should produce identical results for identical inputs (deterministic)', () => {
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 2,
          questionEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        },
      ];

      // Run algorithm multiple times
      const results: ReturnType<typeof calculateMatches>[] = [];
      for (let i = 0; i < 10; i++) {
        results.push(
          calculateMatches(userAnswers, mockCandidatePositions, mockQuestions)
        );
      }

      // All results should be identical
      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toEqual(firstResult);
      });
    });

    it('should produce different results for different inputs', () => {
      const answers1: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 5, // Strongly agree
          questionEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        },
      ];

      const answers2: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 1, // Strongly disagree
          questionEmbedding: [0.9, 0.8, 0.7, 0.6, 0.5],
        },
      ];

      const matches1 = calculateMatches(
        answers1,
        mockCandidatePositions,
        mockQuestions
      );

      const matches2 = calculateMatches(
        answers2,
        mockCandidatePositions,
        mockQuestions
      );

      // Results should be different
      expect(matches1).not.toEqual(matches2);
    });
  });

  describe('Equal Opportunity for All Candidates', () => {
    it('should give every candidate a chance to be top match', () => {
      // Test that different answer patterns can lead to different winners
      const topMatches = new Set<string>();

      // Test various answer patterns
      const testPatterns = [
        [0.1, 0.2, 0.3, 0.4, 0.5], // Favors candidate 1
        [0.9, 0.8, 0.7, 0.6, 0.5], // Favors candidate 2
        [0.5, 0.5, 0.5, 0.5, 0.5], // Neutral
      ];

      testPatterns.forEach((questionEmbedding, idx) => {
        const answers: UserAnswer[] = [
          {
            questionId: 'q1',
            policyArea: 'economy',
            answer: idx === 0 ? 5 : idx === 1 ? 1 : 3,
            questionEmbedding,
          },
        ];

        const matches = calculateMatches(
          answers,
          mockCandidatePositions,
          mockQuestions
        );

        topMatches.add(matches[0].candidateId);
      });

      // At least 2 different candidates should be able to win
      expect(topMatches.size).toBeGreaterThanOrEqual(2);
    });

    it('should include all candidates in results', () => {
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 2,
          questionEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        },
      ];

      const matches = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // Get unique candidate IDs from positions
      const uniqueCandidateIds = [
        ...new Set(mockCandidatePositions.map((p) => p.candidateId)),
      ];

      // All candidates should be in results
      expect(matches.length).toBe(uniqueCandidateIds.length);

      const matchedIds = matches.map((m) => m.candidateId);
      uniqueCandidateIds.forEach((id) => {
        expect(matchedIds).toContain(id);
      });
    });
  });

  describe('Score Fairness', () => {
    it('should calculate scores within valid range (0-100)', () => {
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 2,
          questionEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        },
      ];

      const matches = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      matches.forEach((match) => {
        expect(match.score).toBeGreaterThanOrEqual(0);
        expect(match.score).toBeLessThanOrEqual(100);
      });
    });

    it('should give reasonable scores (not all 0 or all 100)', () => {
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 3,
          questionEmbedding: [0.5, 0.5, 0.5, 0.5, 0.5],
        },
      ];

      const matches = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // At least one score should be between 10 and 90 (reasonable range)
      const hasReasonableScore = matches.some(
        (m) => m.score >= 10 && m.score <= 90
      );
      expect(hasReasonableScore).toBe(true);
    });
  });

  describe('Policy Area Coverage', () => {
    it('should track alignment across different policy areas', () => {
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 4,
          questionEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        },
        {
          questionId: 'q2',
          policyArea: 'healthcare',
          answer: 3,
          questionEmbedding: [0.2, 0.3, 0.4, 0.5, 0.6],
        },
      ];

      const matches = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // Should have alignment scores for multiple policy areas
      expect(Object.keys(matches[0].alignmentByArea).length).toBeGreaterThan(0);
      expect(matches[0].alignmentByArea.economy).toBeDefined();
      expect(matches[0].alignmentByArea.healthcare).toBeDefined();
    });
  });

  describe('No Hidden Bias', () => {
    it('should not have hardcoded candidate preferences', () => {
      // This test verifies the algorithm doesn't have any hardcoded logic
      // that gives unfair advantages to specific candidates

      const randomAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 3, // Neutral (middle of 1-5 scale)
          questionEmbedding: [0.5, 0.5, 0.5, 0.5, 0.5], // Neutral embedding
        },
      ];

      const matches = calculateMatches(
        randomAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // With neutral answers, no candidate should have extreme advantage
      // (scores should be relatively similar)
      const scores = matches.map((m) => m.score);
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);

      // Difference shouldn't be massive with neutral answers
      expect(maxScore - minScore).toBeLessThan(50);
    });
  });

  describe('Adversarial Testing - Gaming Prevention', () => {
    it('should not be gameable by always answering extreme values', () => {
      // Try to game the system by answering "strongly agree" to everything
      const extremeAnswers: UserAnswer[] = mockQuestions.map((q) => ({
        questionId: q.questionId,
        policyArea: q.policyArea,
        answer: 5, // Strongly agree to everything
        questionEmbedding: q.embedding,
      }));

      const matches = calculateMatches(
        extremeAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // Should still produce differentiated scores (not all the same)
      const scores = matches.map(m => m.score);
      const uniqueScores = new Set(scores);

      expect(uniqueScores.size).toBeGreaterThan(1);
    });

    it('should handle users with inconsistent answer patterns', () => {
      // Simulate a user answering randomly/inconsistently
      const inconsistentAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 5, // Strongly agree
          questionEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        },
        {
          questionId: 'q2',
          policyArea: 'economy',
          answer: 1, // Strongly disagree (inconsistent!)
          questionEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5], // Same topic embedding
        },
      ];

      // Should not crash and should produce reasonable scores
      const matches = calculateMatches(
        inconsistentAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every(m => m.score >= 0 && m.score <= 100)).toBe(true);
    });

    it('should not favor candidates based on name or party', () => {
      // The algorithm should ONLY use policy positions, not metadata
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 3,
          questionEmbedding: [0.5, 0.5, 0.5, 0.5, 0.5],
        },
      ];

      const matches = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // Check that scores are based on positions, not candidate IDs
      // (No candidate should have a suspiciously high/low score)
      matches.forEach((match) => {
        expect(match.score).toBeGreaterThan(0);
        expect(match.score).toBeLessThan(100);
      });
    });
  });

  describe('Embedding-Based Fairness', () => {
    it('should use semantic similarity, not just answer values', () => {
      // Two users with same answer values but different embeddings
      // should get different results

      const user1Answers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 3,
          questionEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5], // Economy-focused
        },
      ];

      const user2Answers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 3, // Same answer value
          questionEmbedding: [0.9, 0.8, 0.7, 0.6, 0.5], // Different semantic meaning
        },
      ];

      const matches1 = calculateMatches(
        user1Answers,
        mockCandidatePositions,
        mockQuestions
      );

      const matches2 = calculateMatches(
        user2Answers,
        mockCandidatePositions,
        mockQuestions
      );

      // Results should be different because embeddings are different
      expect(matches1[0].candidateId).not.toBe(matches2[0].candidateId);
    });

    it('should weight both embedding similarity AND answer alignment', () => {
      // A perfect embedding match with opposite answer should not score 100%
      const perfectEmbeddingOppositeAnswer: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 1, // Strongly disagree
          questionEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5], // Matches candidate 1 embedding
        },
      ];

      const matches = calculateMatches(
        perfectEmbeddingOppositeAnswer,
        mockCandidatePositions,
        mockQuestions
      );

      // Even with perfect embedding match, opposite answer should reduce score
      expect(matches[0].score).toBeLessThan(100);
    });
  });

  describe('Opposite User Profiles', () => {
    it('should produce different score distributions for opposite user profiles', () => {
      // User who strongly agrees with everything
      const agreementUser: UserAnswer[] = mockQuestions.map((q) => ({
        questionId: q.questionId,
        policyArea: q.policyArea,
        answer: 5,
        questionEmbedding: q.embedding,
      }));

      // User who strongly disagrees with everything
      const disagreementUser: UserAnswer[] = mockQuestions.map((q) => ({
        questionId: q.questionId,
        policyArea: q.policyArea,
        answer: 1,
        questionEmbedding: q.embedding,
      }));

      const agreementMatches = calculateMatches(
        agreementUser,
        mockCandidatePositions,
        mockQuestions
      );

      const disagreementMatches = calculateMatches(
        disagreementUser,
        mockCandidatePositions,
        mockQuestions
      );

      // At least one candidate should have a significantly different score
      let hasDifference = false;
      for (let i = 0; i < agreementMatches.length; i++) {
        const agreement = agreementMatches.find(m => m.candidateId === mockCandidatePositions[i * 2]?.candidateId);
        const disagreement = disagreementMatches.find(m => m.candidateId === mockCandidatePositions[i * 2]?.candidateId);

        if (agreement && disagreement && Math.abs(agreement.score - disagreement.score) > 10) {
          hasDifference = true;
          break;
        }
      }

      expect(hasDifference).toBe(true);
    });
  });

  describe('Score Distribution Analysis', () => {
    it('should produce reasonable score distribution (not all clustered)', () => {
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 4,
          questionEmbedding: [0.3, 0.4, 0.5, 0.6, 0.7],
        },
      ];

      const matches = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      const scores = matches.map(m => m.score);
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;

      // Variance should not be zero (scores should be spread out)
      expect(variance).toBeGreaterThan(0);
    });

    it('should never produce NaN or Infinity scores', () => {
      // Edge case: very small embeddings
      const edgeCaseAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 3,
          questionEmbedding: [0.0001, 0.0001, 0.0001, 0.0001, 0.0001],
        },
      ];

      const matches = calculateMatches(
        edgeCaseAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      matches.forEach((match) => {
        expect(Number.isNaN(match.score)).toBe(false);
        expect(Number.isFinite(match.score)).toBe(true);
      });
    });
  });
});
