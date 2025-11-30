/**
 * Training Utilities
 * Utility functions for the training pipeline including retry logic,
 * validation, cost estimation, and progress logging.
 */

import type { PolicyPosition, Question } from '@/types/training';

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param retries - Number of retry attempts
 * @param backoffMs - Initial backoff duration in milliseconds
 * @returns Promise with function result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        const delay = backoffMs * Math.pow(2, attempt);
        console.warn(
          `Attempt ${attempt + 1}/${retries + 1} failed: ${lastError.message}. ` +
          `Retrying in ${delay}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Validate policy position structure
 * @param position - Policy position to validate
 * @returns true if valid, false otherwise
 */
export function validatePolicyPosition(position: PolicyPosition): boolean {
  if (!position || typeof position !== 'object') return false;

  const requiredFields = ['candidateId', 'policyArea', 'position', 'embedding'];
  for (const field of requiredFields) {
    if (!(field in position)) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }

  // Validate policy area
  const validPolicyAreas = [
    'economy',
    'healthcare',
    'education',
    'security',
    'environment',
    'social',
    'infrastructure'
  ];

  if (!validPolicyAreas.includes(position.policyArea)) {
    console.error(`Invalid policy area: ${position.policyArea}`);
    return false;
  }

  // Validate position is not empty
  if (typeof position.position !== 'string' || position.position.trim().length === 0) {
    console.error('Position text cannot be empty');
    return false;
  }

  // Validate embedding
  if (!Array.isArray(position.embedding) || position.embedding.length === 0) {
    console.error('Invalid embedding array');
    return false;
  }

  // Check embedding values are numbers
  if (!position.embedding.every(val => typeof val === 'number' && !isNaN(val))) {
    console.error('Embedding must contain only valid numbers');
    return false;
  }

  return true;
}

/**
 * Validate question structure
 * @param question - Question to validate
 * @returns true if valid, false otherwise
 */
export function validateQuestion(question: Question): boolean {
  if (!question || typeof question !== 'object') return false;

  const requiredFields = ['questionId', 'policyArea', 'text', 'type', 'embedding'];
  for (const field of requiredFields) {
    if (!(field in question)) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }

  // Validate policy area
  const validPolicyAreas = [
    'economy',
    'healthcare',
    'education',
    'security',
    'environment',
    'social',
    'infrastructure'
  ];

  if (!validPolicyAreas.includes(question.policyArea)) {
    console.error(`Invalid policy area: ${question.policyArea}`);
    return false;
  }

  // Validate question text
  if (typeof question.text !== 'string' || question.text.trim().length === 0) {
    console.error('Question text cannot be empty');
    return false;
  }

  // Validate question type
  const validTypes = ['agreement-scale', 'specific-choice'];
  if (!validTypes.includes(question.type)) {
    console.error(`Invalid question type: ${question.type}`);
    return false;
  }

  // Validate options for specific-choice questions
  if (question.type === 'specific-choice') {
    if (!Array.isArray(question.options) || question.options.length < 2) {
      console.error('Specific-choice questions must have at least 2 options');
      return false;
    }
  }

  // Validate embedding
  if (!Array.isArray(question.embedding) || question.embedding.length === 0) {
    console.error('Invalid embedding array');
    return false;
  }

  // Check embedding values are numbers
  if (!question.embedding.every(val => typeof val === 'number' && !isNaN(val))) {
    console.error('Embedding must contain only valid numbers');
    return false;
  }

  return true;
}

/**
 * Estimate cost for OpenAI API call
 * @param model - Model name (e.g., 'gpt-4o-mini', 'o1-pro')
 * @param tokens - Estimated token count
 * @returns Estimated cost in USD
 */
export function estimateCost(model: string, tokens: number): number {
  // Pricing as of January 2025 (per 1M tokens)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.150, output: 0.600 },
    'o1-pro': { input: 15.00, output: 60.00 },
    'o1': { input: 15.00, output: 60.00 },
    'gpt-4o': { input: 2.50, output: 10.00 },
    'text-embedding-3-small': { input: 0.020, output: 0 },
  };

  const modelPricing = pricing[model] || pricing['gpt-4o-mini'];

  // Assume 50/50 split for input/output tokens for generation models
  const inputTokens = tokens * 0.5;
  const outputTokens = tokens * 0.5;

  const cost = (
    (inputTokens / 1_000_000) * modelPricing.input +
    (outputTokens / 1_000_000) * modelPricing.output
  );

  return cost;
}

/**
 * Log progress with timestamp and optional data
 * @param message - Progress message
 * @param data - Optional data to log
 */
export function logProgress(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}]`;

  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param vec1 - First vector
 * @param vec2 - Second vector
 * @returns Cosine similarity score (0-1)
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);

  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Chunk text into smaller pieces for processing
 * @param text - Text to chunk
 * @param maxTokens - Maximum tokens per chunk (approximate)
 * @param overlap - Token overlap between chunks
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  maxTokens: number = 2000,
  overlap: number = 200
): string[] {
  // Rough estimation: 1 token ≈ 4 characters for Spanish
  const charsPerToken = 4;
  const maxChars = maxTokens * charsPerToken;
  const overlapChars = overlap * charsPerToken;

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;

    // Don't split in the middle of a word
    if (end < text.length) {
      const nextSpace = text.indexOf(' ', end);
      if (nextSpace !== -1 && nextSpace - end < 100) {
        end = nextSpace;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlapChars;

    // Avoid creating tiny overlapping chunks at the end
    if (start >= text.length - overlapChars) break;
  }

  return chunks;
}

/**
 * Detect potential bias in text
 * @param text - Text to analyze
 * @returns Array of potential bias indicators
 */
export function detectBiasIndicators(text: string): string[] {
  const biasPatterns = [
    { pattern: /siempre|nunca|todo|nada/gi, type: 'absolute language' },
    { pattern: /obviamente|claramente|evidentemente/gi, type: 'presumptive language' },
    { pattern: /debe|tienen que|obligatorio/gi, type: 'prescriptive language' },
    { pattern: /mejor|peor|superior|inferior/gi, type: 'comparative judgments' },
  ];

  const indicators: string[] = [];

  for (const { pattern, type } of biasPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 3) {
      indicators.push(`High frequency of ${type}: ${matches.length} occurrences`);
    }
  }

  return indicators;
}
