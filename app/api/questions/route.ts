import { NextRequest, NextResponse } from 'next/server';
import { getQuestions } from '@/lib/db/dynamodb';
import { logProgress, validateQuestion } from '@/lib/training/utils';
import { API_LIMITS } from '@/lib/constants';
import { selectRandomQuestions } from '@/lib/utils/question-selection';

const { MIN, MAX, DEFAULT } = API_LIMITS.QUESTIONS;

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
