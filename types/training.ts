/**
 * Type definitions for the training pipeline
 */

/**
 * Policy position extracted from candidate document
 */
export interface PolicyPosition {
  candidateId: string;
  policyArea: string;
  position: string;
  embedding: number[];
  extractedAt?: string;
}

/**
 * Question for the voter matching quiz
 */
export interface Question {
  questionId: string;
  policyArea: string;
  text: string;
  type: 'agreement-scale' | 'specific-choice';
  options?: string[];
  embedding: number[];
  weight: number;
  biasScore?: number;
}

/**
 * Valid policy areas
 */
export type PolicyArea =
  | 'economy'
  | 'healthcare'
  | 'education'
  | 'security'
  | 'environment'
  | 'social'
  | 'infrastructure';

/**
 * Candidate information
 */
export interface Candidate {
  candidateId: string;
  name: string;
  party: string;
  pdfPath: string;
  photoPath: string;
  logoPath: string;
  website: string;
  metadata?: {
    sourceFile: string;
    processingDate?: string;
  };
}
