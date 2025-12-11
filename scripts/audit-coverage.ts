#!/usr/bin/env tsx
// Production Coverage Audit - Fast in-process testing for 100% candidate coverage

import 'dotenv/config';
import { getAllCandidatePositions, getQuestions } from '../lib/db/dynamodb';
import { calculateMatches } from '../lib/matching/algorithm';
import type { CandidatePosition, Question } from '../lib/types';

interface UserAnswer {
  questionId: string;
  answer: number | string;
  policyArea: string;
  questionEmbedding: number[];
}

interface MatchResult {
  candidateId: string;
  name: string;
  party: string;
  score: number;
}

const MAX_TESTS = 1000;
const QUESTION_COUNTS = [10, 15, 20];

let cachedPositions: CandidatePosition[] | null = null;
const cachedQuestions: Map<number, Question[]> = new Map();

async function loadCandidatePositions(): Promise<CandidatePosition[]> {
  if (!cachedPositions) {
    console.log('📊 Loading candidate positions from database...\n');
    cachedPositions = await getAllCandidatePositions();
    console.log(`✅ Loaded ${cachedPositions.length} positions for ${new Set(cachedPositions.map(p => p.candidateId)).size} candidates\n`);
  }
  return cachedPositions;
}

async function loadQuestions(limit: number): Promise<Question[]> {
  if (!cachedQuestions.has(limit)) {
    cachedQuestions.set(limit, await getQuestions(limit, false)); // randomize=false for consistent testing
  }
  return cachedQuestions.get(limit)!;
}

function getMatches(
  answers: UserAnswer[],
  candidatePositions: CandidatePosition[],
  questions: Question[]
): MatchResult[] {
  return calculateMatches(answers, candidatePositions, questions);
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

function generateSystematicAnswers(
  questions: Question[],
  pattern: 'strongly-agree' | 'strongly-disagree' | 'neutral' | 'progressive' | 'conservative' | 'moderate'
): UserAnswer[] {
  return questions.map(q => {
    let answer: number | string;

    if (q.type === 'agreement-scale') {
      switch (pattern) {
        case 'strongly-agree': answer = 5; break;
        case 'strongly-disagree': answer = 1; break;
        case 'neutral': answer = 3; break;
        case 'progressive': answer = Math.floor(Math.random() * 2) + 4; break;
        case 'conservative': answer = Math.floor(Math.random() * 2) + 1; break;
        case 'moderate': answer = Math.floor(Math.random() * 2) + 3; break;
      }
    } else {
      if (!q.options || q.options.length === 0) {
        throw new Error(`Question ${q.questionId} has no options`);
      }
      switch (pattern) {
        case 'strongly-agree':
        case 'progressive':
          answer = q.options[q.options.length - 1];
          break;
        case 'strongly-disagree':
        case 'conservative':
          answer = q.options[0];
          break;
        case 'neutral':
        case 'moderate':
          answer = q.options[Math.floor(q.options.length / 2)];
          break;
      }
    }

    return {
      questionId: q.questionId,
      answer,
      policyArea: q.policyArea,
      questionEmbedding: q.embedding,
    };
  });
}

async function testQuestionCount(
  questionCount: number,
  candidatePositions: CandidatePosition[]
): Promise<{
  coverage: number;
  rankedFirst: Set<string>;
  totalCandidates: number;
  testsRun: number;
}> {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`📊 TESTING ${questionCount} QUESTIONS`);
  console.log('='.repeat(100));

  const questions = await loadQuestions(questionCount);
  console.log(`✅ Fetched ${questions.length} questions from API`);

  const byArea = new Map<string, number>();
  questions.forEach(q => byArea.set(q.policyArea, (byArea.get(q.policyArea) || 0) + 1));
  console.log('\nPolicy area distribution:');
  for (const [area, count] of byArea.entries()) {
    console.log(`  ${area}: ${count} questions`);
  }

  const rankedFirstCandidates = new Set<string>();
  const totalCandidates = new Set(candidatePositions.map(p => p.candidateId)).size;
  console.log(`\nTotal candidates in system: ${totalCandidates}\n`);

  const patterns: Array<{
    name: string;
    type: 'strongly-agree' | 'strongly-disagree' | 'neutral' | 'progressive' | 'conservative' | 'moderate';
  }> = [
    { name: 'All Strongly Agree', type: 'strongly-agree' },
    { name: 'All Strongly Disagree', type: 'strongly-disagree' },
    { name: 'All Neutral', type: 'neutral' },
    { name: 'Progressive (4-5)', type: 'progressive' },
    { name: 'Conservative (1-2)', type: 'conservative' },
    { name: 'Moderate (3-4)', type: 'moderate' },
  ];

  console.log('🎯 Testing systematic patterns:\n');

  for (const pattern of patterns) {
    const userAnswers = generateSystematicAnswers(questions, pattern.type);
    const matches = getMatches(userAnswers, candidatePositions, questions);

    if (matches.length > 0) {
      const winner = matches[0];
      if (!rankedFirstCandidates.has(winner.candidateId)) {
        rankedFirstCandidates.add(winner.candidateId);
        console.log(`${pattern.name.padEnd(30)} → #1: ${winner.name} ⭐ NEW`);
      } else {
        console.log(`${pattern.name.padEnd(30)} → #1: ${winner.name}`);
      }
    }
  }

  console.log(`\nCoverage after patterns: ${rankedFirstCandidates.size}/${totalCandidates}\n`);

  console.log('🎲 Running random tests:\n');
  let testsRun = 0;

  for (let test = 0; test < MAX_TESTS && rankedFirstCandidates.size < totalCandidates; test++) {
    testsRun = test + 1;
    const userAnswers = generateRandomAnswers(questions);
    const matches = getMatches(userAnswers, candidatePositions, questions);

    if (matches.length > 0) {
      const winner = matches[0];
      if (!rankedFirstCandidates.has(winner.candidateId)) {
        rankedFirstCandidates.add(winner.candidateId);
        console.log(`Random Test ${testsRun.toString().padStart(4)}`.padEnd(30) + ` → #1: ${winner.name} ⭐ NEW`);
      }
    }

    if (testsRun % 100 === 0) {
      console.log(`  Progress: ${testsRun}/${MAX_TESTS} tests, ${rankedFirstCandidates.size}/${totalCandidates} candidates ranked #1`);
    }
  }

  const coverage = (rankedFirstCandidates.size / totalCandidates) * 100;

  console.log(`\n${'='.repeat(100)}`);
  console.log(`\n📊 RESULTS FOR ${questionCount} QUESTIONS:\n`);
  console.log(`  Candidates that can rank #1: ${rankedFirstCandidates.size}/${totalCandidates}`);
  console.log(`  Coverage: ${coverage.toFixed(1)}%`);
  console.log(`  Tests run: ${testsRun + patterns.length}`);

  if (coverage === 100) {
    console.log('\n✅ SUCCESS: 100% COVERAGE!');
  } else {
    console.log(`\n❌ FAILED: ${coverage.toFixed(1)}% COVERAGE`);
  }

  return {
    coverage,
    rankedFirst: rankedFirstCandidates,
    totalCandidates,
    testsRun: testsRun + patterns.length,
  };
}

async function runFullAudit(): Promise<void> {
  console.log('🎯 PRODUCTION COVERAGE AUDIT - ALL QUESTION COUNTS\n');
  console.log('Goal: Verify 100% coverage for 15, 20, and 30 question suites\n');
  console.log('Ethical requirement: Every candidate must have a fair chance to rank #1\n');

  const candidatePositions = await loadCandidatePositions();

  const results: Array<{
    count: number;
    coverage: number;
    passed: boolean;
  }> = [];

  for (const count of QUESTION_COUNTS) {
    try {
      const result = await testQuestionCount(count, candidatePositions);
      results.push({
        count,
        coverage: result.coverage,
        passed: result.coverage === 100,
      });
    } catch (error) {
      console.error(`\n❌ Test failed for ${count} questions:`, error);
      results.push({
        count,
        coverage: 0,
        passed: false,
      });
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log('\n📊 FINAL SUMMARY\n');
  console.log('='.repeat(100));

  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.count} questions: ${result.coverage.toFixed(1)}% coverage`);
  }

  const allPassed = results.every(r => r.passed);

  console.log('\n' + '='.repeat(100));

  if (allPassed) {
    console.log('\n✅ SUCCESS: 100% COVERAGE ACHIEVED FOR ALL QUESTION COUNTS!');
    console.log('   All candidates can rank #1 with every question suite.');
    console.log('   The system is ethically fair to all candidates.\n');
    process.exit(0);
  } else {
    console.log('\n❌ ETHICAL REQUIREMENT NOT MET');
    console.log('   Some candidates cannot rank #1 with certain question counts.');
    console.log('   This creates an unfair system that structurally disadvantages candidates.\n');
    process.exit(1);
  }
}

runFullAudit().catch(error => {
  console.error('\n❌ Audit failed:', error);
  process.exit(1);
});
