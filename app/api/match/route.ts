import { NextRequest, NextResponse } from 'next/server';
import { getAllCandidatePositions, getQuestions } from '@/lib/db/dynamodb';
import { calculateMatches, type UserAnswer } from '@/lib/matching/algorithm';
import { logProgress, validatePolicyPosition, validateQuestion } from '@/lib/training/utils';
import { API_LIMITS, POLICY_AREAS } from '@/lib/constants';

const MAX_ANSWERS = API_LIMITS.ANSWERS.MAX;
const VALID_POLICY_AREAS = POLICY_AREAS as readonly string[];

function validateUserAnswer(answer: UserAnswer): boolean {
  if (!answer || typeof answer !== 'object') return false;
  if (!answer.questionId || typeof answer.questionId !== 'string') return false;
  if (answer.answer === undefined || answer.answer === null) return false;
  if (!answer.policyArea || !VALID_POLICY_AREAS.includes(answer.policyArea)) return false;
  if (!Array.isArray(answer.questionEmbedding) || answer.questionEmbedding.length === 0) return false;
  if (!answer.questionEmbedding.every(val => typeof val === 'number' && !isNaN(val))) return false;

  return true;
}

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

    const [candidatePositions, questions] = await Promise.all([
      getAllCandidatePositions(),
      getQuestions(200),
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
