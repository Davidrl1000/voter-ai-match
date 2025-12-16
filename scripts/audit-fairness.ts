/**
 * Comprehensive Fairness Audit
 *
 * Tests:
 * 1. Probability distribution (Coefficient of Variation)
 * 2. Candidate rotation (top/bottom mobility)
 */

import 'dotenv/config';
import { getAllCandidatePositions, getQuestions } from '../lib/db/dynamodb';
import { calculateMatches } from '../lib/matching/algorithm';
import type { Question } from '../lib/types';

interface UserAnswer {
  questionId: string;
  answer: number | string;
  policyArea: string;
  questionEmbedding: number[];
}

function generateRandomAnswers(questions: Question[]): UserAnswer[] {
  return questions.map(q => {
    let answer: number | string;
    if (q.type === 'agreement-scale') {
      answer = Math.floor(Math.random() * 5) + 1;
    } else {
      if (!q.options || q.options.length === 0) {
        throw new Error(`Question ${q.questionId} has no options`);
      }
      answer = q.options[Math.floor(Math.random() * q.options.length)];
    }
    return {
      questionId: q.questionId,
      answer,
      policyArea: q.policyArea,
      questionEmbedding: q.embedding,
    };
  });
}

async function auditFairness(questionCount: number, testCount: number) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`📊 FAIRNESS AUDIT: ${questionCount} QUESTIONS (${testCount} tests)`);
  console.log('='.repeat(100));

  const positions = await getAllCandidatePositions();
  const questions = await getQuestions(questionCount, true);

  console.log(`✅ Loaded ${positions.length} positions, ${questions.length} questions\n`);

  const rankingCounts = new Map<string, number>();
  const top3Counts = new Map<string, number>();
  const topKAppearances = new Map<string, number>();
  const bottomKAppearances = new Map<string, number>();

  const allCandidates = new Set(positions.map(p => p.candidateId));
  for (const candidate of allCandidates) {
    rankingCounts.set(candidate, 0);
    top3Counts.set(candidate, 0);
    topKAppearances.set(candidate, 0);
    bottomKAppearances.set(candidate, 0);
  }

  for (let i = 0; i < testCount; i++) {
    const answers = generateRandomAnswers(questions);
    const results = calculateMatches(answers, positions, questions);

    if (results.length > 0) {
      const winner = results[0].candidateId;
      rankingCounts.set(winner, (rankingCounts.get(winner) || 0) + 1);

      for (let j = 0; j < Math.min(3, results.length); j++) {
        const candidate = results[j].candidateId;
        top3Counts.set(candidate, (top3Counts.get(candidate) || 0) + 1);
      }

      for (let j = 0; j < Math.min(5, results.length); j++) {
        const candidate = results[j].candidateId;
        topKAppearances.set(candidate, (topKAppearances.get(candidate) || 0) + 1);
      }

      for (let j = Math.max(0, results.length - 5); j < results.length; j++) {
        const candidate = results[j].candidateId;
        bottomKAppearances.set(candidate, (bottomKAppearances.get(candidate) || 0) + 1);
      }
    }

    if ((i + 1) % 100 === 0) {
      process.stdout.write(`\r  Progress: ${i + 1}/${testCount}...`);
    }
  }
  console.log(`\r  ✅ Completed ${testCount} tests\n`);

  // Calculate statistics
  const rankings = Array.from(rankingCounts.entries())
    .map(([candidateId, count]) => ({
      candidateId,
      count,
      percentage: (count / testCount) * 100,
      top3Count: top3Counts.get(candidateId) || 0,
      top5Count: topKAppearances.get(candidateId) || 0,
      bot5Count: bottomKAppearances.get(candidateId) || 0,
    }))
    .sort((a, b) => b.count - a.count);

  const counts = rankings.map(r => r.count);
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0;

  console.log('📊 TOP 1 RANKING DISTRIBUTION:\n');
  console.log('Candidate                              #1 Count    %     Top3 %  Top5 %  Bot5 %');
  console.log('-'.repeat(100));

  for (const r of rankings.slice(0, 10)) {
    console.log(
      `${r.candidateId.padEnd(45)} ${r.count.toString().padStart(3)}   ${r.percentage.toFixed(1).padStart(5)}%  ${((r.top3Count / testCount) * 100).toFixed(1).padStart(5)}%  ${((r.top5Count / testCount) * 100).toFixed(1).padStart(5)}%  ${((r.bot5Count / testCount) * 100).toFixed(1).padStart(5)}%`
    );
  }
  console.log('...');
  for (const r of rankings.slice(-3)) {
    console.log(
      `${r.candidateId.padEnd(45)} ${r.count.toString().padStart(3)}   ${r.percentage.toFixed(1).padStart(5)}%  ${((r.top3Count / testCount) * 100).toFixed(1).padStart(5)}%  ${((r.top5Count / testCount) * 100).toFixed(1).padStart(5)}%  ${((r.bot5Count / testCount) * 100).toFixed(1).padStart(5)}%`
    );
  }

  console.log('\n📈 FAIRNESS METRICS:\n');
  console.log(`  Expected: ${mean.toFixed(2)} wins per candidate (${(100 / allCandidates.size).toFixed(1)}%)`);
  console.log(`  Actual range: ${Math.min(...counts)} - ${Math.max(...counts)} wins`);
  console.log(`  Coefficient of Variation: ${cv.toFixed(2)}%`);
  console.log(`  ${cv < 20 ? '✅ EXCELLENT' : cv < 50 ? '✅ GOOD' : '⚠️  NEEDS WORK'} (target: <50%)\n`);

  // Rotation analysis
  const topKValues = Array.from(topKAppearances.values());
  const topKMean = topKValues.reduce((s, v) => s + v, 0) / topKValues.length;
  const topKVariance = topKValues.reduce((s, v) => s + Math.pow(v - topKMean, 2), 0) / topKValues.length;
  const topKCV = (Math.sqrt(topKVariance) / topKMean) * 100;

  const stuckAtTop = rankings.filter(r => r.top5Count / testCount > 0.4 && r.bot5Count / testCount < 0.15).length;
  const stuckAtBottom = rankings.filter(r => r.bot5Count / testCount > 0.4 && r.top5Count / testCount < 0.15).length;

  console.log('🔄 ROTATION ANALYSIS:\n');
  console.log(`  Top-5 rotation CV: ${topKCV.toFixed(2)}% ${topKCV < 30 ? '✅' : '⚠️'}`);
  console.log(`  Stuck at top: ${stuckAtTop} candidates ${stuckAtTop === 0 ? '✅' : '⚠️'}`);
  console.log(`  Stuck at bottom: ${stuckAtBottom} candidates ${stuckAtBottom === 0 ? '✅' : '⚠️'}\n`);

  return { cv, topKCV, stuckAtTop, stuckAtBottom };
}

async function main() {
  console.log('🎯 FAIRNESS AUDIT - PROBABILITY DISTRIBUTION & ROTATION\n');
  console.log('Tests whether all candidates have fair chances across different quizzes\n');

  const configs = [
    { questions: 10, tests: 500 },
    { questions: 15, tests: 500 },
    { questions: 20, tests: 500 },
  ];

  const results = [];
  for (const { questions, tests } of configs) {
    const result = await auditFairness(questions, tests);
    results.push({ questions, ...result });
  }

  console.log('\n' + '='.repeat(100));
  console.log('📊 SUMMARY');
  console.log('='.repeat(100));

  for (const r of results) {
    const cvStatus = r.cv < 50 ? '✅' : '⚠️';
    const rotStatus = r.stuckAtTop === 0 && r.stuckAtBottom === 0 ? '✅' : '⚠️';
    console.log(`${cvStatus} ${r.questions}Q: CV=${r.cv.toFixed(1)}% | Rotation: ${rotStatus}`);
  }

  const allGood = results.every(r => r.cv < 50 && r.stuckAtTop === 0 && r.stuckAtBottom === 0);
  console.log(`\n${allGood ? '✅' : '⚠️'} Overall: ${allGood ? 'FAIR SYSTEM' : 'NEEDS REVIEW'}\n`);
}

main().catch(console.error);
