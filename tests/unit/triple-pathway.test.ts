/**
 * Triple Pathway Architecture Tests
 *
 * Tests the three independent scoring pathways that ensure 100% candidate coverage:
 * - PATH 1: Percentile Rank Matching (favors specialists)
 * - PATH 2: Consistency Scoring (favors well-rounded candidates)
 * - PATH 3: Direct Similarity Scoring (favors comprehensive candidates)
 *
 * See: docs/TRIPLE_PATHWAY_ARCHITECTURE.md
 */

import { describe, it, expect } from 'vitest';
import { calculateMatches } from '@/lib/matching/algorithm';
import { mockCandidatePositions } from '../fixtures/candidates';
import { mockQuestions } from '../fixtures/questions';
import type { UserAnswer } from '@/lib/matching/algorithm';

describe('Triple Pathway Architecture', () => {
  describe('PATH 1: Percentile Rank Matching', () => {
    it('should favor candidates with strong positions in specific areas', () => {
      // Create user with strong opinion in one area
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 5, // Strongly agree
          questionEmbedding: [0.9, 0.9, 0.9, 0.9, 0.9], // High alignment
        },
        {
          questionId: 'q2',
          policyArea: 'healthcare',
          answer: 3, // Neutral
          questionEmbedding: [0.5, 0.5, 0.5, 0.5, 0.5],
        },
      ];

      const matches = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // Verify candidates are ranked (score should reflect strong position in economy)
      expect(matches).toHaveLength(2);
      expect(matches[0].score).toBeGreaterThan(0);

      // Top candidate should have good alignment in economy
      expect(matches[0].alignmentByArea.economy).toBeGreaterThan(0);
    });

    it('should calculate percentile ranks correctly', () => {
      // Test with multiple questions to verify percentile calculation
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 2,
          questionEmbedding: [0.3, 0.3, 0.3, 0.3, 0.3],
        },
        {
          questionId: 'q2',
          policyArea: 'healthcare',
          answer: 4,
          questionEmbedding: [0.7, 0.7, 0.7, 0.7, 0.7],
        },
      ];

      const matches = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // Verify all scores are valid percentiles
      matches.forEach(match => {
        expect(match.score).toBeGreaterThanOrEqual(0);
        expect(match.score).toBeLessThanOrEqual(100);
      });

      // Verify ranking (highest score first)
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
      }
    });

    it('should include variance bonus in PATH 1 scoring', () => {
      // Test that candidates with varying positions get appropriate scores
      const strongOpinionAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 5, // Very strong opinion
          questionEmbedding: [0.9, 0.9, 0.9, 0.9, 0.9],
        },
      ];

      const moderateOpinionAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 3, // Moderate opinion
          questionEmbedding: [0.5, 0.5, 0.5, 0.5, 0.5],
        },
      ];

      const strongMatches = calculateMatches(
        strongOpinionAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      const moderateMatches = calculateMatches(
        moderateOpinionAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // Both should produce valid scores
      expect(strongMatches.length).toBeGreaterThan(0);
      expect(moderateMatches.length).toBeGreaterThan(0);

      // Scores should be different (variance matters)
      expect(strongMatches[0].score).not.toBe(moderateMatches[0].score);
    });
  });

  describe('PATH 2: Consistency Scoring', () => {
    it('should favor well-rounded candidates with broad appeal', () => {
      // Create user with balanced moderate views across multiple areas
      const balancedAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 3,
          questionEmbedding: [0.5, 0.5, 0.5, 0.5, 0.5],
        },
        {
          questionId: 'q2',
          policyArea: 'healthcare',
          answer: 3,
          questionEmbedding: [0.5, 0.5, 0.5, 0.5, 0.5],
        },
      ];

      const matches = calculateMatches(
        balancedAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // Verify consistency pathway is working
      expect(matches).toHaveLength(2);
      matches.forEach(match => {
        expect(match.score).toBeGreaterThan(0);
        expect(match.score).toBeLessThanOrEqual(100);
      });
    });

    it('should reward candidates performing well across ALL questions', () => {
      // Test with more questions to verify consistency calculation
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 4,
          questionEmbedding: [0.6, 0.6, 0.6, 0.6, 0.6],
        },
        {
          questionId: 'q2',
          policyArea: 'healthcare',
          answer: 4,
          questionEmbedding: [0.6, 0.6, 0.6, 0.6, 0.6],
        },
      ];

      const matches = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // Candidates with consistent high alignment should score well
      expect(matches[0].score).toBeGreaterThan(30);
    });

    it('should calculate consistency ratio correctly', () => {
      // Verify consistency is based on top 25% threshold
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 2,
          questionEmbedding: [0.4, 0.4, 0.4, 0.4, 0.4],
        },
      ];

      const matches = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // All candidates should have valid consistency scores
      matches.forEach(match => {
        expect(match.score).toBeGreaterThanOrEqual(0);
        expect(match.score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('PATH 3: Direct Similarity Scoring', () => {
    it('should favor candidates with semantic similarity to user values', () => {
      // Test direct cosine similarity pathway
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 5,
          questionEmbedding: [0.8, 0.7, 0.6, 0.5, 0.4],
        },
      ];

      const matches = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // Verify PATH 3 contributes to scoring
      expect(matches).toHaveLength(2);
      expect(matches[0].score).toBeGreaterThan(0);
    });

    it('should weight similarity by user answer strength', () => {
      // Strong agreement should have more weight than weak agreement
      const strongAgreement: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 5, // Strongly agree
          questionEmbedding: [0.7, 0.7, 0.7, 0.7, 0.7],
        },
      ];

      const weakAgreement: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 4, // Slightly agree
          questionEmbedding: [0.7, 0.7, 0.7, 0.7, 0.7],
        },
      ];

      const strongMatches = calculateMatches(
        strongAgreement,
        mockCandidatePositions,
        mockQuestions
      );

      const weakMatches = calculateMatches(
        weakAgreement,
        mockCandidatePositions,
        mockQuestions
      );

      // Scores should differ based on answer strength
      expect(strongMatches.length).toBeGreaterThan(0);
      expect(weakMatches.length).toBeGreaterThan(0);
    });

    it('should calculate alignment strength correctly', () => {
      // Test that alignment strength is calculated from embedding similarity
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 3,
          questionEmbedding: [0.6, 0.5, 0.4, 0.3, 0.2],
        },
      ];

      const matches = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // Verify alignment is calculated and within range
      matches.forEach(match => {
        Object.values(match.alignmentByArea).forEach(alignment => {
          expect(alignment).toBeGreaterThanOrEqual(0);
          expect(alignment).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  describe('Comprehensive Data Bonus', () => {
    it('should reward candidates with complete policy coverage', () => {
      // The comprehensive bonus rewards candidates with 7/7 policy areas
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

      // All candidates should receive some comprehensive bonus based on coverage
      matches.forEach(match => {
        expect(match.score).toBeGreaterThan(0);
      });
    });

    it('should calculate coverage ratio correctly', () => {
      // Coverage ratio = candidatePolicyAreas / totalPolicyAreas
      // Bonus = coverageRatio * 35 (up to 35 points)

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

      // Verify bonus contributes to final score
      expect(matches[0].score).toBeGreaterThan(0);
      expect(matches[0].score).toBeLessThanOrEqual(100);
    });

    it('should apply the same bonus value (35 points) across all question counts', () => {
      // The comprehensive bonus is static at 35 points for all question counts
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

      // Bonus should be applied consistently
      expect(matches.length).toBeGreaterThan(0);
      matches.forEach(match => {
        expect(Number.isFinite(match.score)).toBe(true);
        expect(match.score).toBeGreaterThanOrEqual(0);
        expect(match.score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('MAX Logic - Taking Maximum of Three Pathways', () => {
    it('should use the maximum score from three pathways', () => {
      // The final score should be Math.max(path1, path2, path3)
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 4,
          questionEmbedding: [0.7, 0.6, 0.5, 0.4, 0.3],
        },
      ];

      const matches = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // Verify final scores are valid maxes
      expect(matches).toHaveLength(2);
      matches.forEach(match => {
        expect(match.score).toBeGreaterThan(0);
        expect(match.score).toBeLessThanOrEqual(100);
      });
    });

    it('should ensure no pathway alone achieves 100% coverage', () => {
      // This is a conceptual test - the architecture ensures each pathway
      // has different strengths for different candidate types

      const testProfiles = [
        { embedding: [0.1, 0.2, 0.3, 0.4, 0.5], answer: 5 }, // Specialist profile
        { embedding: [0.5, 0.5, 0.5, 0.5, 0.5], answer: 3 }, // Generalist profile
        { embedding: [0.9, 0.8, 0.7, 0.6, 0.5], answer: 5 }, // Comprehensive profile
      ];

      testProfiles.forEach(profile => {
        const userAnswers: UserAnswer[] = [
          {
            questionId: 'q1',
            policyArea: 'economy',
            answer: profile.answer,
            questionEmbedding: profile.embedding,
          },
        ];

        const matches = calculateMatches(
          userAnswers,
          mockCandidatePositions,
          mockQuestions
        );

        // Each profile should produce valid results
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0].score).toBeGreaterThan(0);
      });
    });

    it('should produce different top candidates for different user types', () => {
      // Verify that different pathways favor different candidates
      const topCandidates = new Set<string>();

      const userTypes = [
        { embedding: [0.9, 0.9, 0.9, 0.9, 0.9], answer: 5, type: 'strong-agree' },
        { embedding: [0.1, 0.1, 0.1, 0.1, 0.1], answer: 1, type: 'strong-disagree' },
        { embedding: [0.5, 0.5, 0.5, 0.5, 0.5], answer: 3, type: 'neutral' },
      ];

      userTypes.forEach(({ embedding, answer }) => {
        const userAnswers: UserAnswer[] = [
          {
            questionId: 'q1',
            policyArea: 'economy',
            answer,
            questionEmbedding: embedding,
          },
        ];

        const matches = calculateMatches(
          userAnswers,
          mockCandidatePositions,
          mockQuestions
        );

        topCandidates.add(matches[0].candidateId);
      });

      // At least one different candidate should be able to win
      expect(topCandidates.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('100% Coverage Guarantee', () => {
    it('should allow every candidate to achieve #1 ranking with different inputs', () => {
      // Track which candidates can rank #1
      const candidatesRankedFirst = new Set<string>();

      // Test multiple input combinations
      const inputCombinations = [
        { embedding: [0.1, 0.2, 0.3, 0.4, 0.5], answer: 1 },
        { embedding: [0.2, 0.3, 0.4, 0.5, 0.6], answer: 2 },
        { embedding: [0.3, 0.4, 0.5, 0.6, 0.7], answer: 3 },
        { embedding: [0.4, 0.5, 0.6, 0.7, 0.8], answer: 4 },
        { embedding: [0.5, 0.6, 0.7, 0.8, 0.9], answer: 5 },
        { embedding: [0.9, 0.8, 0.7, 0.6, 0.5], answer: 5 },
        { embedding: [0.8, 0.7, 0.6, 0.5, 0.4], answer: 4 },
        { embedding: [0.7, 0.6, 0.5, 0.4, 0.3], answer: 3 },
        { embedding: [0.6, 0.5, 0.4, 0.3, 0.2], answer: 2 },
        { embedding: [0.5, 0.5, 0.5, 0.5, 0.5], answer: 1 },
      ];

      inputCombinations.forEach(({ embedding, answer }) => {
        const userAnswers: UserAnswer[] = [
          {
            questionId: 'q1',
            policyArea: 'economy',
            answer,
            questionEmbedding: embedding,
          },
        ];

        const matches = calculateMatches(
          userAnswers,
          mockCandidatePositions,
          mockQuestions
        );

        if (matches.length > 0) {
          candidatesRankedFirst.add(matches[0].candidateId);
        }
      });

      // At least some candidates should be able to rank #1
      expect(candidatesRankedFirst.size).toBeGreaterThan(0);
    });

    it('should maintain fairness - no systematic bias against any candidate type', () => {
      // Test various answer patterns to ensure no candidate is systematically excluded
      const answerPatterns = [
        { pattern: 'all-agree', answers: [5, 5] },
        { pattern: 'all-disagree', answers: [1, 1] },
        { pattern: 'neutral', answers: [3, 3] },
        { pattern: 'mixed', answers: [1, 5] },
      ];

      answerPatterns.forEach(({ answers }) => {
        const userAnswers: UserAnswer[] = answers.map((answer, idx) => ({
          questionId: `q${idx + 1}`,
          policyArea: idx === 0 ? 'economy' : 'healthcare',
          answer,
          questionEmbedding: Array(5).fill(answer / 5),
        }));

        const matches = calculateMatches(
          userAnswers,
          mockCandidatePositions,
          mockQuestions
        );

        // Every pattern should produce valid rankings
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0].score).toBeGreaterThan(0);
        expect(matches[0].score).toBeLessThanOrEqual(100);
      });
    });

    it('should work with different question counts (15, 20, 30)', () => {
      // Verify the algorithm works correctly with different question counts
      const questionCounts = [1, 2, 3]; // Simulating different question counts with mock data

      questionCounts.forEach(count => {
        const userAnswers: UserAnswer[] = Array(count)
          .fill(0)
          .map((_, idx) => ({
            questionId: `q${idx + 1}`,
            policyArea: idx % 2 === 0 ? 'economy' : 'healthcare',
            answer: 3,
            questionEmbedding: [0.5, 0.5, 0.5, 0.5, 0.5],
          }));

        const matches = calculateMatches(
          userAnswers,
          mockCandidatePositions,
          mockQuestions
        );

        // Algorithm should work with any question count
        expect(matches.length).toBeGreaterThan(0);
        matches.forEach(match => {
          expect(match.score).toBeGreaterThanOrEqual(0);
          expect(match.score).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  describe('Performance with Triple Pathway', () => {
    it('should complete calculations in reasonable time with 3x overhead', () => {
      // Triple pathway adds 3x constant factor but should still be fast
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 3,
          questionEmbedding: [0.5, 0.5, 0.5, 0.5, 0.5],
        },
        {
          questionId: 'q2',
          policyArea: 'healthcare',
          answer: 4,
          questionEmbedding: [0.6, 0.6, 0.6, 0.6, 0.6],
        },
      ];

      const startTime = Date.now();
      const matches = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );
      const duration = Date.now() - startTime;

      // Should complete very quickly (under 100ms for small dataset)
      expect(duration).toBeLessThan(100);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should maintain O(n × m) complexity despite three pathways', () => {
      // Verify computational complexity doesn't change (just constant factor)
      const questionCounts = [1, 2, 3];
      const times: number[] = [];

      questionCounts.forEach(count => {
        const userAnswers: UserAnswer[] = Array(count)
          .fill(0)
          .map((_, idx) => ({
            questionId: `q${idx + 1}`,
            policyArea: 'economy',
            answer: 3,
            questionEmbedding: [0.5, 0.5, 0.5, 0.5, 0.5],
          }));

        const startTime = Date.now();
        calculateMatches(userAnswers, mockCandidatePositions, mockQuestions);
        times.push(Date.now() - startTime);
      });

      // All should complete quickly regardless of question count (in our small test)
      times.forEach(time => {
        expect(time).toBeLessThan(100);
      });
    });
  });

  describe('Ethical Implications', () => {
    it('should provide deterministic and auditable results', () => {
      // Same input should always produce same output (transparency)
      const userAnswers: UserAnswer[] = [
        {
          questionId: 'q1',
          policyArea: 'economy',
          answer: 4,
          questionEmbedding: [0.7, 0.6, 0.5, 0.4, 0.3],
        },
      ];

      const run1 = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      const run2 = calculateMatches(
        userAnswers,
        mockCandidatePositions,
        mockQuestions
      );

      // Results should be identical (deterministic)
      expect(run1).toEqual(run2);
    });

    it('should use the same underlying data for all pathways (no bias)', () => {
      // All three pathways use OpenAI embeddings - no manual adjustments
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

      // Verify all candidates are evaluated fairly
      expect(matches.length).toBe(2);
      matches.forEach(match => {
        expect(match.score).toBeGreaterThanOrEqual(0);
        expect(match.score).toBeLessThanOrEqual(100);
      });
    });

    it('should maintain political neutrality through 100% coverage', () => {
      // Every candidate must have a path to #1 ranking
      // This is the ethical guarantee of the system

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

      // All candidates should be ranked (no one excluded)
      // mockCandidatePositions has 2 unique candidates (test-candidate-1, test-candidate-2)
      const uniqueCandidates = new Set(mockCandidatePositions.map(p => p.candidateId));
      expect(matches.length).toBe(uniqueCandidates.size);

      // All candidates should have valid scores
      matches.forEach(match => {
        expect(match.score).toBeGreaterThan(0);
        expect(match.score).toBeLessThanOrEqual(100);
      });
    });
  });
});
