'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { Question } from '@/lib/db/dynamodb';
import type { UserAnswer } from '@/lib/matching/algorithm';
import { POLICY_AREA_LABELS } from '@/lib/constants';
import { trackGTMEvent, GTMEvents } from '@/lib/gtm';
import LoadingSpinner from './LoadingSpinner';

interface QuizProps {
  onComplete: (answers: UserAnswer[]) => void;
  questionLimit: number;
  preloadedQuestions?: Question[];
}

const agreementOptions = [
  { value: 1, label: 'Muy en desacuerdo', iconPath: '/assets/icons/agreement-1.svg' },
  { value: 2, label: 'En desacuerdo', iconPath: '/assets/icons/agreement-2.svg' },
  { value: 3, label: 'Neutral', iconPath: '/assets/icons/agreement-3.svg' },
  { value: 4, label: 'De acuerdo', iconPath: '/assets/icons/agreement-4.svg' },
  { value: 5, label: 'Muy de acuerdo', iconPath: '/assets/icons/agreement-5.svg' },
];

export default function Quiz({ onComplete, questionLimit, preloadedQuestions }: QuizProps) {
  const [questions, setQuestions] = useState<Question[]>(preloadedQuestions || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(!preloadedQuestions || preloadedQuestions.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If questions are preloaded, no need to fetch
    if (preloadedQuestions && preloadedQuestions.length > 0) {
      return;
    }

    // Otherwise, fetch questions from API
    async function loadQuestions() {
      try {
        const response = await fetch(`/api/questions?limit=${questionLimit}`);
        if (!response.ok) {
          throw new Error('Failed to load questions');
        }
        const data = await response.json();
        setQuestions(data.questions);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading questions');
        setLoading(false);
      }
    }

    loadQuestions();
  }, [questionLimit, preloadedQuestions]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleAnswer = useCallback(() => {
    if (selectedAnswer === null || !currentQuestion) return;

    const answer: UserAnswer = {
      questionId: currentQuestion.questionId,
      answer: selectedAnswer,
      policyArea: currentQuestion.policyArea,
      questionEmbedding: currentQuestion.embedding,
    };

    // Track question answered
    trackGTMEvent(GTMEvents.QUIZ_QUESTION_ANSWERED, {
      questionNumber: currentIndex + 1,
      policyArea: currentQuestion.policyArea,
      policyAreaLabel: POLICY_AREA_LABELS[currentQuestion.policyArea],
      answerValue: selectedAnswer,
      totalQuestions: questions.length,
    });

    let newAnswers;
    if (currentIndex < answers.length) {
      // Re-answering a previous question - replace just this answer, keep all others
      newAnswers = [
        ...answers.slice(0, currentIndex),
        answer,
        ...answers.slice(currentIndex + 1)
      ];
    } else {
      // Answering a new question
      newAnswers = [...answers, answer];
    }
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      if (newAnswers[nextIndex]) {
        setSelectedAnswer(newAnswers[nextIndex].answer);
      } else {
        setSelectedAnswer(null);
      }
    } else {
      // Track quiz completion
      trackGTMEvent(GTMEvents.QUIZ_COMPLETED, {
        totalQuestions: questions.length,
        answeredQuestions: newAnswers.length,
      });
      onComplete(newAnswers);
    }
  }, [selectedAnswer, currentQuestion, currentIndex, answers, questions.length, onComplete]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      const previousIndex = currentIndex - 1;
      setCurrentIndex(previousIndex);

      if (answers[previousIndex]) {
        setSelectedAnswer(answers[previousIndex].answer);
      } else {
        setSelectedAnswer(null);
      }
    }
  }, [currentIndex, answers]);

  const handleSelectAnswer = useCallback((value: number | string) => {
    setSelectedAnswer(value);
  }, []);

  if (loading) {
    return <LoadingSpinner message="Cargando preguntas..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-7rem)] bg-white px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const questionsRemaining = questions.length - (currentIndex + 1);
  const timeEstimate = Math.ceil(questionsRemaining * 0.25); // ~15 seconds per question
  const progressPercent = Math.round(progress);

  // Motivational messages with icons based on progress
  const getMotivationalData = () => {
    if (progressPercent >= 75) return { message: '¡Un toque más!', icon: '/assets/icons/flag.svg' };
    if (progressPercent >= 50) return { message: '¡A medio camino!', icon: '/assets/icons/rocket.svg' };
    if (progressPercent >= 25) return { message: '¡Vamos bien!', icon: '/assets/icons/lightning.svg' };
    return { message: '¡Pura vida!', icon: '/assets/icons/star.svg' };
  };

  const motivationalData = getMotivationalData();

  return (
    <div className="min-h-[calc(100vh-var(--header-height,7rem))] bg-gray-50 py-3 sm:py-8 px-4">
      <div className="max-w-2xl mx-auto w-full">
        {/* Screen reader announcement for question changes */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          Pregunta {currentIndex + 1} de {questions.length}. {POLICY_AREA_LABELS[currentQuestion.policyArea]}.
        </div>

        {/* AI Badge */}
        <div className="flex justify-center mb-3 sm:mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-full">
            <div className="w-3.5 h-3.5">
              <Image
                src="/assets/icons/ai-sparkle.svg"
                alt="Ícono de inteligencia artificial"
                width={14}
                height={14}
                className="w-full h-full"
              />
            </div>
            <span className="text-xs font-medium bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Powered by AI
            </span>
          </div>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="mb-4 sm:mb-6 bg-white border-2 border-blue-100 rounded-xl p-3 sm:p-4 shadow-sm">
          {/* Progress Stats */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {progressPercent}%
              </span>
              <div className="flex items-center gap-1.5">
                <Image
                  src={motivationalData.icon}
                  alt=""
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
                <span className="text-xs sm:text-sm font-medium text-gray-600">
                  {motivationalData.message}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs sm:text-sm font-semibold text-gray-700">
                {currentIndex + 1} de {questions.length}
              </p>
              {questionsRemaining > 0 && (
                <p className="text-xs text-gray-500">
                  ~{timeEstimate} min
                </p>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div
            className="bg-gray-100 rounded-full h-3 sm:h-4 overflow-hidden relative"
            role="progressbar"
            aria-valuenow={currentIndex + 1}
            aria-valuemin={1}
            aria-valuemax={questions.length}
            aria-label={`Progreso del cuestionario: pregunta ${currentIndex + 1} de ${questions.length}`}
          >
            <div
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 h-full transition-all duration-500 ease-out relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>

          {/* Milestone message */}
          {questionsRemaining > 0 && (
            <p className="text-xs text-center mt-2 text-blue-600 font-medium">
              ¡Solo {questionsRemaining} {questionsRemaining === 1 ? 'pregunta' : 'preguntas'} más para ver tu resultado!
            </p>
          )}
        </div>

        {/* Question Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-8">
          {/* Category Tag */}
          <div className="mb-3 sm:mb-5">
            <span className="inline-block px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {POLICY_AREA_LABELS[currentQuestion.policyArea] || currentQuestion.policyArea}
            </span>
          </div>

          {/* Question Text */}
          <h2
            id={`question-${currentIndex}`}
            className="text-base sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6"
          >
            {currentQuestion.text}
          </h2>

          {/* Linking text for specific-choice questions */}
          {currentQuestion.type === 'specific-choice' && (
            <p className="text-sm text-gray-600 mb-3 sm:mb-4 font-medium">
              De las siguientes alternativas, seleccione la que mejor refleje su posición o área de interés:
            </p>
          )}

          {/* Answer Options */}
          <fieldset className="mb-4 sm:mb-6">
            <legend className="sr-only">Seleccione su respuesta</legend>
            <div role="radiogroup" aria-labelledby={`question-${currentIndex}`} className="space-y-2 sm:space-y-2.5">
              {currentQuestion.type === 'agreement-scale' ? (
                agreementOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelectAnswer(option.value)}
                    role="radio"
                    aria-checked={selectedAnswer === option.value}
                    aria-label={option.label}
                    className={`w-full p-2.5 sm:p-4 text-left rounded-lg border-2 transition-all text-sm sm:text-base cursor-pointer ${
                      selectedAnswer === option.value
                        ? 'border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 w-6 h-5 ${
                        selectedAnswer === option.value ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                        <Image
                          src={option.iconPath}
                          alt=""
                          width={24}
                          height={20}
                          className="w-full h-full"
                        />
                      </div>
                      <span className="font-medium text-gray-900">{option.label}</span>
                    </div>
                  </button>
                ))
              ) : (
                currentQuestion.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(option)}
                    role="radio"
                    aria-checked={selectedAnswer === option}
                    aria-label={option}
                    className={`w-full p-2.5 sm:p-4 text-left rounded-lg border-2 transition-all text-sm sm:text-base cursor-pointer ${
                      selectedAnswer === option
                        ? 'border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{option}</span>
                  </button>
                ))
              )}
            </div>
          </fieldset>

          {/* Navigation */}
          <nav className="pt-3 sm:pt-4 border-t border-gray-100" aria-label="Navegación del cuestionario">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-between sm:gap-3">
              <button
                onClick={handleBack}
                disabled={currentIndex === 0}
                aria-label={`Ir a la pregunta anterior (${currentIndex} de ${questions.length})`}
                className="px-4 py-2.5 text-sm text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Image
                  src="/assets/icons/arrow-left.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
                <span>Anterior</span>
              </button>

              <button
                onClick={handleAnswer}
                disabled={selectedAnswer === null}
                aria-label={currentIndex === questions.length - 1 ? 'Finalizar cuestionario y ver resultados' : `Ir a la siguiente pregunta (${currentIndex + 2} de ${questions.length})`}
                aria-disabled={selectedAnswer === null}
                className="px-4 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <span>{currentIndex === questions.length - 1 ? 'Ver Resultados' : 'Siguiente'}</span>
                <Image
                  src="/assets/icons/arrow-right.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="w-4 h-4 brightness-0 invert"
                />
              </button>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
