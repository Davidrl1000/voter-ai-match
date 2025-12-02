'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Question } from '@/lib/db/dynamodb';
import type { UserAnswer } from '@/lib/matching/algorithm';
import { POLICY_AREA_LABELS } from '@/lib/constants';
import LoadingSpinner from './LoadingSpinner';

interface QuizProps {
  onComplete: (answers: UserAnswer[]) => void;
  questionLimit: number;
  preloadedQuestions?: Question[];
}

const agreementOptions = [
  { value: 1, label: 'Muy en desacuerdo' },
  { value: 2, label: 'En desacuerdo' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'De acuerdo' },
  { value: 5, label: 'Muy de acuerdo' },
];

export default function Quiz({ onComplete, questionLimit, preloadedQuestions }: QuizProps) {
  // Initialize questions with preloaded data if available
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

  const handleAnswer = () => {
    if (selectedAnswer === null || !currentQuestion) return;

    const answer: UserAnswer = {
      questionId: currentQuestion.questionId,
      answer: selectedAnswer,
      policyArea: currentQuestion.policyArea,
      questionEmbedding: currentQuestion.embedding,
    };

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
    } else {
      onComplete(newAnswers);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setAnswers(answers.slice(0, -1));
      setSelectedAnswer(null);
    }
  };

  const canSubmitEarly = currentIndex >= 9 && answers.length >= 10;

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

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-gray-50 py-6 sm:py-8 px-4 flex items-center">
      <div className="max-w-2xl mx-auto w-full">
        {/* AI Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-full">
            <div className="w-3.5 h-3.5">
              <Image
                src="/assets/icons/ai-sparkle.svg"
                alt=""
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

        {/* Progress */}
        <div className="mb-6">
          <div className="bg-white border border-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Pregunta {currentIndex + 1} de {questions.length}
          </p>
        </div>

        {/* Question Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          {/* Category Tag */}
          <div className="mb-5">
            <span className="inline-block px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {POLICY_AREA_LABELS[currentQuestion.policyArea] || currentQuestion.policyArea}
            </span>
          </div>

          {/* Question Text */}
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">
            {currentQuestion.text}
          </h2>

          {/* Answer Options */}
          <div className="space-y-2.5 mb-6">
            {currentQuestion.type === 'agreement-scale' ? (
              agreementOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedAnswer(option.value)}
                  className={`w-full p-3.5 sm:p-4 text-left rounded-lg border-2 transition-all text-sm sm:text-base cursor-pointer ${
                    selectedAnswer === option.value
                      ? 'border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className="font-medium text-gray-900">{option.label}</span>
                </button>
              ))
            ) : (
              currentQuestion.options?.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAnswer(option)}
                  className={`w-full p-3.5 sm:p-4 text-left rounded-lg border-2 transition-all text-sm sm:text-base cursor-pointer ${
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

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleBack}
              disabled={currentIndex === 0}
              className="px-5 py-2.5 text-sm text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all order-1 sm:order-none"
            >
              ← Anterior
            </button>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={handleAnswer}
                disabled={selectedAnswer === null}
                className="px-5 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all order-2 sm:order-none"
              >
                {currentIndex === questions.length - 1 ? 'Ver Resultados →' : 'Siguiente →'}
              </button>
              {canSubmitEarly && currentIndex < questions.length - 1 && (
                <button
                  onClick={() => onComplete(answers)}
                  className="px-5 py-2.5 text-sm text-blue-600 font-medium rounded-lg border border-blue-200 hover:bg-blue-50 transition-all whitespace-nowrap cursor-pointer order-3 sm:order-none"
                >
                  Finalizar ({answers.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
