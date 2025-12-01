import { NextRequest, NextResponse } from 'next/server';
import { getQuestions } from '@/lib/db/dynamodb';
import { logProgress, validateQuestion } from '@/lib/training/utils';
import { API_LIMITS, POLICY_AREAS, type PolicyArea } from '@/lib/constants';
import type { Question } from '@/lib/db/dynamodb';

const { MIN, MAX, DEFAULT } = API_LIMITS.QUESTIONS;

/**
 * Fisher-Yates shuffle algorithm for randomizing array order
 */
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Select random questions ensuring diversity across policy areas
 * Guarantees at least 1 question per policy area, then fills remaining with random selection
 */
function selectRandomQuestions(allQuestions: Question[], count: number): Question[] {
  // Group questions by policy area
  const questionsByArea = new Map<PolicyArea, Question[]>();
  for (const area of POLICY_AREAS) {
    questionsByArea.set(area, []);
  }

  for (const question of allQuestions) {
    const areaQuestions = questionsByArea.get(question.policyArea as PolicyArea);
    if (areaQuestions) {
      areaQuestions.push(question);
    }
  }

  const selected: Question[] = [];

  // Step 1: Select at least 1 random question from each policy area
  for (const [, questions] of questionsByArea.entries()) {
    if (questions.length > 0) {
      const randomIndex = Math.floor(Math.random() * questions.length);
      selected.push(questions[randomIndex]);
      // Remove selected question to avoid duplicates
      questions.splice(randomIndex, 1);
    }
  }

  // Step 2: Fill remaining slots with random questions from all areas
  const remaining = count - selected.length;
  if (remaining > 0) {
    // Flatten remaining questions
    const remainingQuestions: Question[] = [];
    for (const questions of questionsByArea.values()) {
      remainingQuestions.push(...questions);
    }

    // Shuffle and take what we need
    const shuffled = shuffle(remainingQuestions);
    selected.push(...shuffled.slice(0, remaining));
  }

  // Step 3: Shuffle final selection so policy areas aren't grouped
  return shuffle(selected);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');

    // Validate and sanitize limit parameter
    let limit: number = DEFAULT;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit)) {
        logProgress('Error: Invalid limit parameter', { limit: limitParam });
        return NextResponse.json(
          { error: 'Invalid limit parameter. Must be a number.' },
          { status: 400 }
        );
      }
      limit = Math.max(MIN, Math.min(parsedLimit, MAX));
    }

    logProgress('Fetching questions from database', { limit });

    // Fetch a large pool of questions for random selection (3x requested amount or 300, whichever is larger)
    const poolSize = Math.max(limit * 3, 300);
    const allQuestions = await getQuestions(poolSize);

    if (allQuestions.length === 0) {
      logProgress('Warning: No questions found in database');
      return NextResponse.json(
        { error: 'No questions found. Please run the training script first.' },
        { status: 404 }
      );
    }

    // Validate questions before selection
    const validQuestions = allQuestions.filter(q => {
      const isValid = validateQuestion(q);
      if (!isValid) {
        logProgress('Warning: Invalid question detected', { questionId: q.questionId });
      }
      return isValid;
    });

    if (validQuestions.length === 0) {
      logProgress('Error: All questions failed validation');
      return NextResponse.json(
        { error: 'No valid questions available' },
        { status: 500 }
      );
    }

    // Select random diverse questions
    const selectedQuestions = selectRandomQuestions(validQuestions, limit);

    logProgress('Questions selected successfully', {
      requested: limit,
      poolSize: allQuestions.length,
      validInPool: validQuestions.length,
      selected: selectedQuestions.length,
    });

    return NextResponse.json({
      questions: selectedQuestions.map(q => ({
        questionId: q.questionId,
        text: q.text,
        type: q.type,
        options: q.options,
        policyArea: q.policyArea,
        embedding: q.embedding,
        weight: q.weight,
      })),
      count: selectedQuestions.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logProgress('Error fetching questions', { error: errorMessage });
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
