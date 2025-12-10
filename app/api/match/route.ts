import { NextRequest, NextResponse } from 'next/server';
import { getAllCandidatePositions, getQuestionsByIds } from '@/lib/db/dynamodb';
import { calculateMatches, type UserAnswer } from '@/lib/matching/algorithm';
import { logProgress, validatePolicyPosition, validateQuestion } from '@/lib/training/utils';
import { validateUserAnswer } from '@/lib/validation/validators';
import { API_LIMITS } from '@/lib/constants';
import { recordMatchResult } from '@/lib/db/match-recording';

const MAX_ANSWERS = API_LIMITS.ANSWERS.MAX;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { answers } = body as { answers: UserAnswer[] };

    // Validate request body
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      logProgress('Error: Invalid request body', { hasAnswers: !!answers, isArray: Array.isArray(answers) });
      return NextResponse.json(
        { error: 'Invalid request body. Expected { answers: UserAnswer[] }' },
        { status: 400 }
      );
    }

    // Validate answer count
    if (answers.length > MAX_ANSWERS) {
      logProgress('Error: Too many answers', { count: answers.length, max: MAX_ANSWERS });
      return NextResponse.json(
        { error: `Too many answers. Maximum is ${MAX_ANSWERS}.` },
        { status: 400 }
      );
    }

    // Validate each answer structure
    const validAnswers = answers.filter(validateUserAnswer);

    if (validAnswers.length === 0) {
      logProgress('Error: No valid answers provided');
      return NextResponse.json(
        { error: 'No valid answers provided' },
        { status: 400 }
      );
    }

    if (validAnswers.length < answers.length) {
      logProgress('Warning: Some answers were invalid', {
        total: answers.length,
        valid: validAnswers.length,
        invalid: answers.length - validAnswers.length,
      });
    }

    logProgress('Fetching candidate positions and questions', { answerCount: validAnswers.length });

    // Extract unique question IDs from valid answers for efficient lookup
    const questionIds = [...new Set(validAnswers.map(a => a.questionId))];

    const [candidatePositions, questions] = await Promise.all([
      getAllCandidatePositions(),
      getQuestionsByIds(questionIds), // Efficient O(1) lookup instead of expensive scan
    ]);

    if (candidatePositions.length === 0) {
      logProgress('Error: No candidate positions in database');
      return NextResponse.json(
        { error: 'No candidate data found. Please run the training script first.' },
        { status: 404 }
      );
    }

    // Validate candidate positions
    const validPositions = candidatePositions.filter(validatePolicyPosition);

    if (validPositions.length === 0) {
      logProgress('Error: No valid candidate positions');
      return NextResponse.json(
        { error: 'No valid candidate data available' },
        { status: 500 }
      );
    }

    // Validate questions
    const validQuestions = questions.filter(validateQuestion);

    logProgress('Data validation complete', {
      positions: { total: candidatePositions.length, valid: validPositions.length },
      questions: { total: questions.length, valid: validQuestions.length },
    });

    logProgress('Calculating matches', { answerCount: validAnswers.length });

    const matches = calculateMatches(validAnswers, validPositions, validQuestions);

    const uniqueCandidates = new Set(validPositions.map(p => p.candidateId)).size;

    logProgress('Match calculation complete', {
      topMatch: matches[0]?.name || 'N/A',
      topScore: matches[0]?.score || 0,
      totalMatches: matches.length,
    });

    // Record match result for aggregated stats (non-blocking, fire-and-forget)
    if (matches.length > 0) {
      recordMatchResult(matches[0].candidateId, validAnswers.length)
        .catch(error => {
          // Log error but don't block the response
          logProgress('Warning: Failed to record match result', { error: error.message });
        });
    }

    return NextResponse.json({
      matches: matches.slice(0, API_LIMITS.MATCHES.DEFAULT_RETURN),
      totalCandidates: uniqueCandidates,
      questionsAnswered: validAnswers.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logProgress('Error calculating matches', { error: errorMessage });
    return NextResponse.json(
      { error: 'Failed to calculate matches' },
      { status: 500 }
    );
  }
}
