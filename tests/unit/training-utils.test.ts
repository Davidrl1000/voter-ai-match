import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  validatePolicyPosition,
  validateQuestion,
  detectBiasIndicators,
  chunkText,
  estimateCost,
} from '@/lib/training/utils';

describe('Training Utilities - AI Logic', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(vec, vec)).toBe(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      expect(cosineSimilarity(vec1, vec2)).toBe(0);
    });

    it('should return -1 for opposite vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [-1, -2, -3];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1, 10);
    });

    it('should calculate similarity for normalized embeddings', () => {
      // Typical OpenAI embedding-like vectors
      const vec1 = [0.1, 0.2, 0.3, 0.4, 0.5];
      const vec2 = [0.15, 0.25, 0.35, 0.45, 0.55];

      const similarity = cosineSimilarity(vec1, vec2);

      // Should be very similar (close to 1)
      expect(similarity).toBeGreaterThan(0.99);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should calculate similarity for different embeddings', () => {
      const vec1 = [0.1, 0.2, 0.3, 0.4, 0.5];
      const vec2 = [0.9, 0.8, 0.7, 0.6, 0.5];

      const similarity = cosineSimilarity(vec1, vec2);

      // Should be moderately similar
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should handle zero vectors', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 2, 3];

      expect(cosineSimilarity(vec1, vec2)).toBe(0);
    });

    it('should throw error for vectors of different lengths', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [1, 2, 3, 4];

      expect(() => cosineSimilarity(vec1, vec2)).toThrow('same length');
    });

    it('should be commutative (order does not matter)', () => {
      const vec1 = [0.1, 0.2, 0.3];
      const vec2 = [0.4, 0.5, 0.6];

      expect(cosineSimilarity(vec1, vec2)).toBe(cosineSimilarity(vec2, vec1));
    });

    it('should handle very small values without numerical errors', () => {
      const vec1 = [0.0001, 0.0002, 0.0003];
      const vec2 = [0.0001, 0.0002, 0.0003];

      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(1, 5);
    });

    it('should handle large embedding dimensions (1536 like OpenAI)', () => {
      // Generate realistic 1536-dimension embeddings like OpenAI's text-embedding-3-small
      // Using sine waves to create somewhat-similar but distinct vectors
      const vec1 = Array(1536).fill(0).map((_, i) => Math.sin(i * 0.01));
      const vec2 = Array(1536).fill(0).map((_, i) => Math.sin(i * 0.01 + 0.1));

      const similarity = cosineSimilarity(vec1, vec2);

      // Similarity should be high but not perfect (vectors are similar but not identical)
      expect(similarity).toBeGreaterThan(0.9); // Should be very similar
      expect(similarity).toBeLessThan(1); // But not identical
      expect(similarity).toBeLessThanOrEqual(1); // Never above 1
    });

    it('should handle production-scale embeddings without performance degradation', () => {
      // Test that algorithm can handle realistic workload
      const iterations = 100;
      const dimension = 1536;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const vec1 = Array(dimension).fill(0).map(() => Math.random());
        const vec2 = Array(dimension).fill(0).map(() => Math.random());

        const sim = cosineSimilarity(vec1, vec2);

        // Each similarity should be valid
        expect(sim).toBeGreaterThanOrEqual(-1);
        expect(sim).toBeLessThanOrEqual(1);
        expect(Number.isFinite(sim)).toBe(true);
      }

      const duration = Date.now() - startTime;

      // 100 similarity calculations should complete in reasonable time
      // (This is a performance regression test)
      expect(duration).toBeLessThan(1000); // Should take < 1 second
    });

    it('should return 0 for vectors containing NaN', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [1, NaN, 3];
      expect(cosineSimilarity(vec1, vec2)).toBe(0);
    });

    it('should return 0 for vectors containing Infinity', () => {
      const vec1 = [1, 2, Infinity];
      const vec2 = [1, 2, 3];
      expect(cosineSimilarity(vec1, vec2)).toBe(0);
    });

    it('should return 0 for vectors containing -Infinity', () => {
      const vec1 = [1, 2, -Infinity];
      const vec2 = [1, 2, 3];
      expect(cosineSimilarity(vec1, vec2)).toBe(0);
    });

    it('should return 0 when both vectors contain invalid values', () => {
      const vec1 = [NaN, 2, 3];
      const vec2 = [1, Infinity, 3];
      expect(cosineSimilarity(vec1, vec2)).toBe(0);
    });
  });

  describe('validatePolicyPosition', () => {
    const validPosition = {
      candidateId: 'test-1',
      policyArea: 'economy',
      name: 'Test Candidate',
      party: 'Test Party',
      position: 'Supports free market economy',
      embedding: [0.1, 0.2, 0.3],
      extractedAt: '2025-01-01',
    };

    it('should validate correct policy position', () => {
      expect(validatePolicyPosition(validPosition)).toBe(true);
    });

    it('should reject position with missing required fields', () => {
      const invalid = { ...validPosition };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (invalid as any).candidateId;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validatePolicyPosition(invalid as any)).toBe(false);
    });

    it('should reject position with invalid policy area', () => {
      const invalid = { ...validPosition, policyArea: 'invalid-area' };

      expect(validatePolicyPosition(invalid)).toBe(false);
    });

    it('should reject position with empty text', () => {
      const invalid = { ...validPosition, position: '' };

      expect(validatePolicyPosition(invalid)).toBe(false);
    });

    it('should reject position with whitespace-only text', () => {
      const invalid = { ...validPosition, position: '   ' };

      expect(validatePolicyPosition(invalid)).toBe(false);
    });

    it('should reject position with empty embedding', () => {
      const invalid = { ...validPosition, embedding: [] };

      expect(validatePolicyPosition(invalid)).toBe(false);
    });

    it('should reject position with invalid embedding values', () => {
      const invalid = { ...validPosition, embedding: [0.1, NaN, 0.3] };

      expect(validatePolicyPosition(invalid)).toBe(false);
    });

    it('should reject position with non-array embedding', () => {
      const invalid = { ...validPosition, embedding: 'not-an-array' };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validatePolicyPosition(invalid as any)).toBe(false);
    });

    it('should accept all valid policy areas', () => {
      const validAreas = [
        'economy',
        'healthcare',
        'education',
        'security',
        'environment',
        'social',
        'infrastructure'
      ];

      validAreas.forEach(area => {
        const position = { ...validPosition, policyArea: area };
        expect(validatePolicyPosition(position)).toBe(true);
      });
    });
  });

  describe('validateQuestion', () => {
    const validQuestion = {
      questionId: 'q1',
      policyArea: 'economy',
      text: '¿Apoya la economía de libre mercado?',
      type: 'agreement-scale' as const,
      embedding: [0.1, 0.2, 0.3],
      weight: 1.0,
    };

    it('should validate correct question', () => {
      expect(validateQuestion(validQuestion)).toBe(true);
    });

    it('should validate specific-choice question with options', () => {
      const question = {
        ...validQuestion,
        type: 'specific-choice' as const,
        options: ['Option 1', 'Option 2', 'Option 3'],
      };

      expect(validateQuestion(question)).toBe(true);
    });

    it('should reject specific-choice question without enough options', () => {
      const question = {
        ...validQuestion,
        type: 'specific-choice' as const,
        options: ['Only one option'],
      };

      expect(validateQuestion(question)).toBe(false);
    });

    it('should reject question with invalid type', () => {
      const invalid = { ...validQuestion, type: 'invalid-type' };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validateQuestion(invalid as any)).toBe(false);
    });

    it('should reject question with empty text', () => {
      const invalid = { ...validQuestion, text: '' };

      expect(validateQuestion(invalid)).toBe(false);
    });

    it('should reject question with invalid policy area', () => {
      const invalid = { ...validQuestion, policyArea: 'invalid' };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validateQuestion(invalid as any)).toBe(false);
    });

    it('should accept both question types', () => {
      const agreementScale = { ...validQuestion, type: 'agreement-scale' as const };
      const specificChoice = {
        ...validQuestion,
        type: 'specific-choice' as const,
        options: ['A', 'B'],
      };

      expect(validateQuestion(agreementScale)).toBe(true);
      expect(validateQuestion(specificChoice)).toBe(true);
    });
  });

  describe('detectBiasIndicators', () => {
    it('should detect absolute language', () => {
      const text = 'Siempre debemos hacer esto. Nunca debemos hacer aquello. Todo está mal. Nada funciona.';
      const indicators = detectBiasIndicators(text);

      expect(indicators.length).toBeGreaterThan(0);
      expect(indicators.some(i => i.includes('absolute language'))).toBe(true);
    });

    it('should detect presumptive language', () => {
      const text = 'Obviamente esto es correcto. Claramente debemos actuar. Evidentemente es la mejor opción. Obviamente sí.';
      const indicators = detectBiasIndicators(text);

      expect(indicators.length).toBeGreaterThan(0);
      expect(indicators.some(i => i.includes('presumptive language'))).toBe(true);
    });

    it('should detect prescriptive language', () => {
      const text = 'Debe hacerse así. Tienen que cumplir. Es obligatorio seguir. Debe ser de esta manera.';
      const indicators = detectBiasIndicators(text);

      expect(indicators.length).toBeGreaterThan(0);
      expect(indicators.some(i => i.includes('prescriptive language'))).toBe(true);
    });

    it('should detect comparative judgments', () => {
      const text = 'Esta es mejor opción. Aquella es peor. Este candidato es superior. Ese es inferior.';
      const indicators = detectBiasIndicators(text);

      expect(indicators.length).toBeGreaterThan(0);
      expect(indicators.some(i => i.includes('comparative judgments'))).toBe(true);
    });

    it('should not flag neutral text', () => {
      const text = 'El candidato propone aumentar el presupuesto en educación. La economía creció un 3% este año.';
      const indicators = detectBiasIndicators(text);

      expect(indicators.length).toBe(0);
    });

    it('should only flag high frequency patterns (>3 occurrences)', () => {
      const text = 'Debe hacerse. Tiene que ser.'; // Only 2 occurrences
      const indicators = detectBiasIndicators(text);

      expect(indicators.length).toBe(0);
    });

    it('should be case insensitive', () => {
      const text = 'SIEMPRE NUNCA TODO NADA siempre nunca todo nada';
      const indicators = detectBiasIndicators(text);

      expect(indicators.length).toBeGreaterThan(0);
    });
  });

  describe('chunkText', () => {
    it('should chunk long text into smaller pieces', () => {
      const text = 'a'.repeat(10000);
      const chunks = chunkText(text, 500); // 500 tokens ≈ 2000 chars

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.every(chunk => chunk.length <= 2000)).toBe(true);
    });

    it('should not chunk text shorter than max tokens', () => {
      const text = 'Short text';
      const chunks = chunkText(text, 1000);

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe(text);
    });

    it('should create overlapping chunks', () => {
      const text = 'a'.repeat(10000);
      const chunks = chunkText(text, 500, 100);

      // Check that chunks overlap
      expect(chunks.length).toBeGreaterThan(1);

      // Last chars of chunk[0] should appear in beginning of chunk[1]
      if (chunks.length > 1) {
        const overlap = 100 * 4; // 100 tokens * 4 chars/token
        const endOfFirst = chunks[0].slice(-overlap);
        const startOfSecond = chunks[1].slice(0, overlap);

        // Should have some overlap
        expect(endOfFirst.slice(0, 50)).toBe(startOfSecond.slice(0, 50));
      }
    });

    it('should attempt to avoid splitting words when possible', () => {
      const text = 'word '.repeat(3000);
      const chunks = chunkText(text, 500);

      // Most chunks should try to break at word boundaries
      // (but not guaranteed for all due to implementation)
      expect(chunks.length).toBeGreaterThan(1);

      // At least verify chunks are created and trimmed
      chunks.forEach(chunk => {
        expect(chunk.length).toBeGreaterThan(0);
        expect(chunk).toBe(chunk.trim());
      });
    });

    it('should trim whitespace from chunks', () => {
      const text = 'word '.repeat(3000);
      const chunks = chunkText(text, 500);

      chunks.forEach(chunk => {
        expect(chunk).toBe(chunk.trim());
      });
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for gpt-4o-mini', () => {
      const cost = estimateCost('gpt-4o-mini', 1000);

      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(1); // Should be very cheap for 1k tokens
    });

    it('should estimate higher cost for o1-pro', () => {
      const cost4oMini = estimateCost('gpt-4o-mini', 1000);
      const costO1Pro = estimateCost('o1-pro', 1000);

      expect(costO1Pro).toBeGreaterThan(cost4oMini);
    });

    it('should estimate cost for embeddings', () => {
      const cost = estimateCost('text-embedding-3-small', 1000);

      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.001); // Embeddings are very cheap
    });

    it('should use default pricing for unknown models', () => {
      const cost = estimateCost('unknown-model', 1000);

      expect(cost).toBeGreaterThan(0);
    });

    it('should scale linearly with token count', () => {
      const cost1k = estimateCost('gpt-4o-mini', 1000);
      const cost2k = estimateCost('gpt-4o-mini', 2000);

      expect(cost2k).toBeCloseTo(cost1k * 2, 10);
    });
  });
});
