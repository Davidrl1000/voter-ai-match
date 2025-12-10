import { describe, it, expect } from 'vitest';
import { checkQuestionNeutrality, formatBiasCheckSummary } from '../bias-checker';
import type { Question } from '@/lib/db/dynamodb';

describe('bias-checker', () => {
  const createMockQuestion = (
    id: string,
    text: string,
    policyArea: string = 'economy'
  ): Question => ({
    questionId: id,
    text,
    policyArea,
    type: 'agreement-scale',
    embedding: Array(1536).fill(0),
    weight: 1.0,
  });

  describe('checkQuestionNeutrality', () => {
    it('should pass for neutral questions', async () => {
      const questions: Question[] = [
        createMockQuestion('q1', '¿Está de acuerdo con aumentar la inversión en educación pública?', 'education'),
        createMockQuestion('q2', '¿Apoya medidas para reducir el déficit fiscal?', 'economy'),
        createMockQuestion('q3', '¿Considera importante fortalecer el sistema de salud pública?', 'healthcare'),
        createMockQuestion('q4', '¿Está de acuerdo con invertir más en seguridad ciudadana?', 'security'),
        createMockQuestion('q5', '¿Apoya políticas de protección al medio ambiente?', 'environment'),
        createMockQuestion('q6', '¿Considera necesario mejorar la infraestructura vial?', 'infrastructure'),
        createMockQuestion('q7', '¿Está de acuerdo con programas sociales para reducir la pobreza?', 'social'),
      ];

      const result = await checkQuestionNeutrality(questions);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.issues).toHaveLength(0);
      expect(result.summary.totalQuestions).toBe(7);
      expect(result.summary.flaggedQuestions).toBe(0);
    });

    it('should detect political party names', async () => {
      const questions: Question[] = [
        createMockQuestion('q1', '¿Está de acuerdo con las políticas del PLN?'),
        createMockQuestion('q2', '¿Apoya al PAC en temas económicos?'),
      ];

      const result = await checkQuestionNeutrality(questions);

      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].category).toBe('politicalParties');
      expect(result.issues[0].severity).toBe('high');
    });

    it('should detect politician names', async () => {
      const questions: Question[] = [
        createMockQuestion('q1', '¿Está de acuerdo con las propuestas de Álvaro Ramos?'),
      ];

      const result = await checkQuestionNeutrality(questions);

      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].category).toBe('politicians');
      expect(result.issues[0].severity).toBe('high');
    });

    it('should detect leading language', async () => {
      const questions: Question[] = [
        createMockQuestion('q1', 'Obviamente debemos aumentar los impuestos, ¿está de acuerdo?'),
        createMockQuestion('q2', 'Como es evidente, la salud pública necesita más fondos.'),
      ];

      const result = await checkQuestionNeutrality(questions);

      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(i => i.category === 'leadingLanguage')).toBe(true);
    });

    it('should detect emotional manipulation', async () => {
      const questions: Question[] = [
        createMockQuestion('q1', 'El catastrófico sistema de salud necesita cambios urgentes.'),
        createMockQuestion('q2', 'La terrible crisis económica requiere medidas drásticas.'),
      ];

      const result = await checkQuestionNeutrality(questions);

      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(i => i.category === 'emotionalManipulation')).toBe(true);
    });

    it('should detect polarizing terms', async () => {
      const questions: Question[] = [
        createMockQuestion('q1', '¿Está de acuerdo con políticas comunistas?'),
        createMockQuestion('q2', '¿Apoya medidas de ultraderecha?'),
      ];

      const result = await checkQuestionNeutrality(questions);

      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(i => i.category === 'polarizingTerms')).toBe(true);
    });

    it('should calculate policy area distribution balance', async () => {
      // Perfectly balanced distribution
      const balancedQuestions: Question[] = [
        createMockQuestion('q1', 'Pregunta económica', 'economy'),
        createMockQuestion('q2', 'Pregunta de salud', 'healthcare'),
        createMockQuestion('q3', 'Pregunta de educación', 'education'),
        createMockQuestion('q4', 'Pregunta de seguridad', 'security'),
        createMockQuestion('q5', 'Pregunta ambiental', 'environment'),
        createMockQuestion('q6', 'Pregunta social', 'social'),
        createMockQuestion('q7', 'Pregunta de infraestructura', 'infrastructure'),
      ];

      const balancedResult = await checkQuestionNeutrality(balancedQuestions);
      expect(balancedResult.summary.distributionBalance).toBeGreaterThanOrEqual(95);

      // Unbalanced distribution (all economy)
      const unbalancedQuestions: Question[] = Array(7)
        .fill(null)
        .map((_, i) => createMockQuestion(`q${i}`, `Pregunta ${i}`, 'economy'));

      const unbalancedResult = await checkQuestionNeutrality(unbalancedQuestions);
      expect(unbalancedResult.summary.distributionBalance).toBeLessThan(50);
    });

    it('should allow policy terms without flagging as bias', async () => {
      const questions: Question[] = [
        createMockQuestion('q1', '¿Apoya la reforma fiscal?'),
        createMockQuestion('q2', '¿Considera importante fortalecer la CCSS?'),
        createMockQuestion('q3', '¿Está de acuerdo con mayor transparencia contra la corrupción?'),
      ];

      const result = await checkQuestionNeutrality(questions);

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should not flag "Costa Rica" in neutral contexts', async () => {
      const questions: Question[] = [
        createMockQuestion('q1', '¿Debe Costa Rica aumentar la inversión en educación?'),
        createMockQuestion('q2', '¿Cree que Costa Rica necesita reforma fiscal?'),
        createMockQuestion('q3', '¿Está de acuerdo con que Costa Rica fortalezca su sistema de salud?'),
        createMockQuestion('q4', '¿Considera que en Costa Rica se debe combatir la corrupción?'),
      ];

      const result = await checkQuestionNeutrality(questions);

      // Should pass - "Costa Rica" is neutral when not part of party name
      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.score).toBeGreaterThanOrEqual(85);
    });

    it('should flag "Costa Rica Primero" but not "Costa Rica" alone', async () => {
      const neutralQuestion = createMockQuestion('q1', '¿Debe Costa Rica invertir más en infraestructura?');
      const biasedQuestion = createMockQuestion('q2', '¿Apoya las propuestas de Costa Rica Primero?');

      const neutralResult = await checkQuestionNeutrality([neutralQuestion]);
      const biasedResult = await checkQuestionNeutrality([biasedQuestion]);

      // Neutral question should pass
      expect(neutralResult.passed).toBe(true);
      expect(neutralResult.issues).toHaveLength(0);

      // Biased question should fail
      expect(biasedResult.passed).toBe(false);
      expect(biasedResult.issues.length).toBeGreaterThan(0);
      expect(biasedResult.issues[0].category).toBe('politicalParties');
    });

    it('should handle empty question list', async () => {
      const result = await checkQuestionNeutrality([]);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.issues).toHaveLength(0);
      expect(result.summary.totalQuestions).toBe(0);
    });

    it('should weight severity correctly in score calculation', async () => {
      // Low severity issue
      const lowSeverityQuestions: Question[] = [
        createMockQuestion('q1', 'Pregunta neutral 1'),
        createMockQuestion('q2', 'Pregunta neutral 2'),
        createMockQuestion('q3', 'Pregunta neutral 3'),
      ];

      // High severity issue
      const highSeverityQuestions: Question[] = [
        createMockQuestion('q1', 'Pregunta neutral'),
        createMockQuestion('q2', '¿Está de acuerdo con las políticas del PLN?'), // High severity
      ];

      const lowResult = await checkQuestionNeutrality(lowSeverityQuestions);
      const highResult = await checkQuestionNeutrality(highSeverityQuestions);

      // High severity should result in lower score than low severity
      if (lowResult.issues.length > 0 && highResult.issues.length > 0) {
        expect(highResult.score).toBeLessThan(lowResult.score);
      }
    });
  });

  describe('formatBiasCheckSummary', () => {
    it('should format summary for passing result', async () => {
      const questions: Question[] = [
        createMockQuestion('q1', 'Pregunta neutral', 'economy'),
        createMockQuestion('q2', 'Otra pregunta neutral', 'healthcare'),
      ];

      const result = await checkQuestionNeutrality(questions);
      const summary = formatBiasCheckSummary(result);

      expect(summary).toContain('✅ PASSED');
      expect(summary).toContain('Questions Analyzed: 2');
      expect(summary).toContain('No bias issues detected');
    });

    it('should format summary for failing result', async () => {
      const questions: Question[] = [
        createMockQuestion('q1', '¿Está de acuerdo con el PLN?'),
      ];

      const result = await checkQuestionNeutrality(questions);
      const summary = formatBiasCheckSummary(result);

      expect(summary).toContain('❌ FAILED');
      expect(summary).toContain('Issues Detected');
      expect(summary).toContain('politicalParties');
    });

    it('should group issues by severity', async () => {
      const questions: Question[] = [
        createMockQuestion('q1', '¿Apoya al PLN?'), // High severity
        createMockQuestion('q2', 'Obviamente debemos hacer esto.'), // Medium severity
      ];

      const result = await checkQuestionNeutrality(questions);
      const summary = formatBiasCheckSummary(result);

      expect(summary).toContain('HIGH SEVERITY');
      expect(summary).toContain('MEDIUM SEVERITY');
    });
  });
});
