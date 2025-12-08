#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import { extractTextFromPDF, calculateReadingTime } from './utils/pdf-utils';

interface PdfStats {
  pageCount: number;
  wordCount: number;
  readingTimeMinutes: number;
  mostUsedWord: string;
}

interface Candidate {
  candidate: string;
  logo: string;
  name: string;
  plan: string;
  politicalParty: string;
  site: string;
  slogan: string;
  planStats?: PdfStats;
}

/**
 * Generate all meaningful n-grams from party name
 * Returns array of phrases like ["liberación nacional", "partido liberación nacional"]
 */
function generatePartyNamePhrases(partyName: string): string[] {
  const normalized = partyName
    .toLowerCase()
    .replace(/[^\wáéíóúñü\s]/gi, '')
    .split(/\s+/)
    .filter(word => word.length > 0);

  const phrases: string[] = [];

  // Generate bigrams and trigrams from party name
  for (let length = 2; length <= Math.min(4, normalized.length); length++) {
    for (let i = 0; i <= normalized.length - length; i++) {
      const phrase = normalized.slice(i, i + length).join(' ');
      phrases.push(phrase);
    }
  }

  return phrases;
}

/**
 * Calculate statistics from extracted text
 */
function calculateStats(text: string, pageCount: number, partyName: string): PdfStats {
  // Remove extra whitespace and normalize
  const cleanedText = text.trim().replace(/\s+/g, ' ');

  // Word count and frequency analysis
  const words = cleanedText
    .toLowerCase()
    .replace(/[^\wáéíóúñü\s]/gi, '') // Keep Spanish characters
    .split(/\s+/)
    .filter(word => word.length > 3); // Only count words longer than 3 chars

  const wordCount = words.length;

  // Calculate reading time
  const readingTimeMinutes = calculateReadingTime(wordCount);

  // Find most common phrase or word
  const stopWords = new Set([
    'para', 'como', 'este', 'esta', 'esto', 'estos', 'estas',
    'todo', 'todos', 'toda', 'todas', 'sobre', 'entre', 'hasta',
    'desde', 'cuando', 'donde', 'porque', 'aunque', 'mientras',
    'pero', 'sino', 'también', 'tampoco', 'cual', 'cuales',
    'muy', 'más', 'menos', 'otro', 'otra', 'otros', 'otras',
    'mismo', 'misma', 'mismos', 'mismas', 'cada', 'algún', 'alguna',
    'algunos', 'algunas', 'ningún', 'ninguna', 'ningunos', 'ningunas',
    'debe', 'pueden', 'deben', 'hacer', 'tiene', 'tienen',
    'será', 'serán', 'sean', 'sido', 'será', 'estar', 'años',
    // PDF navigation artifacts
    'volver', 'contenido'
  ]);

  // Generate party name phrases (bigrams, trigrams, etc.)
  const partyPhrases = generatePartyNamePhrases(partyName);
  const partyPhraseFrequency = new Map<string, number>();

  // Count party name phrases in the text
  for (const phrase of partyPhrases) {
    const phraseWords = phrase.split(' ');
    const phraseLength = phraseWords.length;

    for (let i = 0; i <= words.length - phraseLength; i++) {
      const textPhrase = words.slice(i, i + phraseLength).join(' ');
      if (textPhrase === phrase) {
        partyPhraseFrequency.set(phrase, (partyPhraseFrequency.get(phrase) || 0) + 1);
      }
    }
  }

  // Count bigrams (two-word phrases)
  const bigramFrequency = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];

    // Skip if either word is a stop word
    if (stopWords.has(word1) || stopWords.has(word2)) continue;

    const bigram = `${word1} ${word2}`;
    bigramFrequency.set(bigram, (bigramFrequency.get(bigram) || 0) + 1);
  }

  // Count single words
  const wordFrequency = new Map<string, number>();
  for (const word of words) {
    if (!stopWords.has(word)) {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    }
  }

  // Find most frequent bigram
  let mostUsedBigram = '';
  let maxBigramCount = 0;
  for (const [bigram, count] of bigramFrequency.entries()) {
    if (count > maxBigramCount) {
      maxBigramCount = count;
      mostUsedBigram = bigram;
    }
  }

  // Find most frequent single word
  let mostUsedWord = 'N/A';
  let maxWordCount = 0;
  for (const [word, count] of wordFrequency.entries()) {
    if (count > maxWordCount) {
      maxWordCount = count;
      mostUsedWord = word;
    }
  }

  // Prefer bigram if it appears at least 60% as often as the top word
  // This prevents preferring rare bigrams over common single words
  let mostUsedTerm = (maxBigramCount >= maxWordCount * 0.6 && mostUsedBigram)
    ? mostUsedBigram
    : mostUsedWord;

  // Check if the most used term is part of a party name phrase
  // If a party phrase containing this word appears frequently, use the party phrase instead
  const mostUsedWords = mostUsedTerm.split(' ');
  let bestPartyPhrase = '';
  let bestPartyRatio = 0;

  for (const [partyPhrase, partyCount] of partyPhraseFrequency.entries()) {
    const partyWords = partyPhrase.split(' ');

    // Check if the party phrase contains any word from the most used term
    const hasOverlap = mostUsedWords.some(word => partyWords.includes(word));

    if (hasOverlap && partyCount > 0) {
      // Calculate what percentage of the most used term is covered by this party phrase
      const referenceCount = mostUsedTerm.split(' ').length === 1 ? maxWordCount : maxBigramCount;
      const ratio = partyCount / referenceCount;

      // Track the best matching party phrase
      if (ratio > bestPartyRatio) {
        bestPartyRatio = ratio;
        bestPartyPhrase = partyPhrase;
      }
    }
  }

  // If a party phrase covers at least 50% of the most used term usage,
  // it's likely they're talking about their party
  if (bestPartyRatio >= 0.5) {
    mostUsedTerm = bestPartyPhrase;
  }

  return {
    pageCount,
    wordCount,
    readingTimeMinutes,
    mostUsedWord: mostUsedTerm
  };
}

/**
 * Main function to extract stats for all candidates
 */
async function main() {
  console.log('📊 Starting PDF statistics extraction...\n');

  // Read candidates.json
  const candidatesPath = path.join(process.cwd(), 'data', 'candidates.json');
  const candidates: Candidate[] = JSON.parse(fs.readFileSync(candidatesPath, 'utf-8'));

  console.log(`Found ${candidates.length} candidates\n`);

  let processed = 0;
  let failed = 0;

  // Process each candidate
  for (const candidate of candidates) {
    const pdfPath = path.join(process.cwd(), 'public', 'assets', 'docs', candidate.plan);

    try {
      console.log(`Processing: ${candidate.politicalParty} (${candidate.plan})...`);

      // Check if PDF exists
      if (!fs.existsSync(pdfPath)) {
        console.log(`  ⚠️  PDF not found: ${pdfPath}`);
        failed++;
        continue;
      }

      // Extract text and page count
      const { text, pageCount } = await extractTextFromPDF(pdfPath);

      // Calculate statistics
      const stats = calculateStats(text, pageCount, candidate.politicalParty);

      // Add stats to candidate
      candidate.planStats = stats;

      console.log(`  ✓ Pages: ${stats.pageCount}`);
      console.log(`  ✓ Words: ${stats.wordCount.toLocaleString()}`);
      console.log(`  ✓ Reading time: ~${stats.readingTimeMinutes} min`);
      console.log(`  ✓ Most used word: "${stats.mostUsedWord}"\n`);

      processed++;
    } catch (error) {
      console.error(`  ❌ Error processing ${candidate.plan}:`, error);
      failed++;
    }
  }

  // Save updated candidates.json
  fs.writeFileSync(
    candidatesPath,
    JSON.stringify(candidates, null, 2),
    'utf-8'
  );

  console.log('\n✅ Statistics extraction complete!');
  console.log(`   Processed: ${processed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`\n📝 Updated: ${candidatesPath}`);
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
