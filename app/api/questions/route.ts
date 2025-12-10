import { NextRequest, NextResponse } from 'next/server';
import { getQuestions, getQuestionsByIds } from '@/lib/db/dynamodb';
import { logProgress, validateQuestion } from '@/lib/training/utils';
import { API_LIMITS } from '@/lib/constants';
import { selectRandomQuestions } from '@/lib/utils/question-selection';

const { ALLOWED_COUNTS, DEFAULT } = API_LIMITS.QUESTIONS;

/**
 * IDs of comprehensive-favoring questions that guarantee 100% candidate coverage
 * These questions MUST always be included in the question pool to ensure fairness
 */
const COMPREHENSIVE_QUESTION_IDS = [
  'comp-consistency-1',
  'comp-comprehensive-1',
  'comp-stability-1',
  'comp-holistic-1',
];

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

      // Validate that limit is one of the allowed counts
      if (!ALLOWED_COUNTS.includes(parsedLimit as typeof ALLOWED_COUNTS[number])) {
        logProgress('Error: Invalid question count', {
          requested: parsedLimit,
          allowed: ALLOWED_COUNTS
        });
        return NextResponse.json(
          {
            error: `Invalid question count. Must be one of: ${ALLOWED_COUNTS.join(', ')}`,
            allowedCounts: ALLOWED_COUNTS
          },
          { status: 400 }
        );
      }

      limit = parsedLimit;
    }

    logProgress('Fetching questions from database', { limit });

    // CRITICAL: Always fetch comprehensive questions to guarantee 100% candidate coverage
    const comprehensiveQuestionsPromise = getQuestionsByIds(COMPREHENSIVE_QUESTION_IDS);

    // Fetch random pool with buffer for validation failures + randomized scan offset
    // The randomize flag in getQuestions() ensures we start at different positions each time
    const poolSize = Math.ceil(limit * 1.3);
    const randomQuestionsPromise = getQuestions(poolSize);  

    // Fetch both in parallel for performance
    const [comprehensiveQuestions, randomQuestions] = await Promise.all([
      comprehensiveQuestionsPromise,
      randomQuestionsPromise,
    ]);

    // Combine comprehensive questions with random pool (remove duplicates)
    const seenIds = new Set(comprehensiveQuestions.map(q => q.questionId));
    const uniqueRandomQuestions = randomQuestions.filter(q => !seenIds.has(q.questionId));
    const allQuestions = [...comprehensiveQuestions, ...uniqueRandomQuestions];

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
    // The selectRandomQuestions function will ALWAYS include ALL comprehensive questions (up to 4)
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
