import type { Question } from '@/lib/db/dynamodb';

export const mockQuestions: Question[] = [
  {
    questionId: 'q1',
    policyArea: 'economy',
    text: '¿Apoya la libre economía de mercado?',
    type: 'agreement-scale',
    embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
    weight: 1.0,
  },
  {
    questionId: 'q2',
    policyArea: 'healthcare',
    text: '¿Apoya la salud universal?',
    type: 'agreement-scale',
    embedding: [0.2, 0.3, 0.4, 0.5, 0.6],
    weight: 1.0,
  },
  {
    questionId: 'q3',
    policyArea: 'education',
    text: '¿Apoya la educación pública gratuita?',
    type: 'agreement-scale',
    embedding: [0.3, 0.4, 0.5, 0.6, 0.7],
    weight: 1.0,
  },
];
