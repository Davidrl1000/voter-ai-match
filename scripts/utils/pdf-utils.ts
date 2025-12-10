import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Extract text from PDF file
 *
 * @param filePath - Absolute path to PDF file
 * @returns Object with extracted text and page count
 */
export async function extractTextFromPDF(filePath: string): Promise<{ text: string; pageCount: number }> {
  const dataBuffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(dataBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n\n';
  }

  return {
    text: fullText,
    pageCount: pdf.numPages
  };
}

/**
 * Calculate reading time in minutes based on word count
 * Uses 200 words per minute as standard for Spanish
 *
 * @param wordCount - Total number of words
 * @returns Reading time in minutes
 */
export function calculateReadingTime(wordCount: number): number {
  const WORDS_PER_MINUTE = 200; // Standard reading speed for Spanish
  return Math.ceil(wordCount / WORDS_PER_MINUTE);
}

/**
 * Format reading time into human-readable string
 *
 * @param minutes - Reading time in minutes
 * @returns Formatted string (e.g., "~25 min" or "~1.5 hrs")
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 60) {
    return `~${minutes} min`;
  }
  const hours = Math.round(minutes / 6) / 10; // Round to 1 decimal
  return `~${hours} hrs`;
}
