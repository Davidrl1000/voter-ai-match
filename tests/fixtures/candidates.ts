import type { CandidatePosition } from '@/lib/db/dynamodb';

/**
 * NEUTRAL Mock Candidate Positions for Testing
 *
 * IMPORTANT: These positions use neutral, descriptive language to avoid
 * introducing political bias into tests. They describe policy proposals
 * without using politically loaded terminology.
 */
export const mockCandidatePositions: CandidatePosition[] = [
  {
    candidateId: 'test-candidate-1',
    policyArea: 'economy',
    name: 'Test Candidate 1',
    party: 'Test Party 1',
    position: 'Proposes 15% corporate tax rate with graduated brackets for small businesses earning under $1M annually',
    embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
    extractedAt: '2025-01-01T00:00:00Z',
  },
  {
    candidateId: 'test-candidate-1',
    policyArea: 'healthcare',
    name: 'Test Candidate 1',
    party: 'Test Party 1',
    position: 'Advocates for expanding public healthcare coverage to 85% of population over 4 years, maintaining private options',
    embedding: [0.2, 0.3, 0.4, 0.5, 0.6],
    extractedAt: '2025-01-01T00:00:00Z',
  },
  {
    candidateId: 'test-candidate-2',
    policyArea: 'economy',
    name: 'Test Candidate 2',
    party: 'Test Party 2',
    position: 'Proposes 25% corporate tax rate with infrastructure investment requirements for companies over $10M revenue',
    embedding: [0.9, 0.8, 0.7, 0.6, 0.5],
    extractedAt: '2025-01-01T00:00:00Z',
  },
  {
    candidateId: 'test-candidate-2',
    policyArea: 'healthcare',
    name: 'Test Candidate 2',
    party: 'Test Party 2',
    position: 'Proposes healthcare voucher system with $5000 annual credit per citizen for insurance selection',
    embedding: [0.8, 0.7, 0.6, 0.5, 0.4],
    extractedAt: '2025-01-01T00:00:00Z',
  },
];
