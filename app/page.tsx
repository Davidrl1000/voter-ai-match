'use client';

import { useState } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import Quiz from '@/components/Quiz';
import Results from '@/components/Results';
import type { UserAnswer } from '@/lib/matching/algorithm';
import type { Question } from '@/lib/db/dynamodb';
import { API_LIMITS, POLICY_AREAS } from '@/lib/constants';

export default function Home() {
  const [stage, setStage] = useState<'welcome' | 'quiz' | 'results'>('welcome');
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [questionLimit, setQuestionLimit] = useState<number>(API_LIMITS.QUESTIONS.DEFAULT);
  const [preloadedQuestions, setPreloadedQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  const handleStart = async () => {
    setIsLoadingQuestions(true);

    try {
      const response = await fetch(`/api/questions?limit=${questionLimit}`);
      const data = await response.json();

      setPreloadedQuestions(data.questions);
      setIsLoadingQuestions(false);
      setStage('quiz');
    } catch (error) {
      console.error('Error loading questions:', error);
      setIsLoadingQuestions(false);
    }
  };

  const handleComplete = (userAnswers: UserAnswer[]) => {
    setAnswers(userAnswers);
    setStage('results');
  };

  const handleRestart = () => {
    setAnswers([]);
    setStage('welcome');
  };

  if (stage === 'quiz') {
    return (
      <>
        <Header />
        <Quiz
          onComplete={handleComplete}
          questionLimit={questionLimit}
          preloadedQuestions={preloadedQuestions}
        />
      </>
    );
  }

  if (stage === 'results') {
    return (
      <>
        <Header />
        <Results answers={answers} onRestart={handleRestart} />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-7rem)] bg-white flex items-center justify-center px-4 py-8">
      <div className="max-w-3xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-10">
          {/* AI Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-full mb-6">
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

          {/* Main Title */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-4 tracking-tight">
            <span className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Votante
            </span>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
              {' '}AI
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-600 mb-2 font-light">
            Encuentra tu candidato ideal
          </p>

          <p className="text-sm sm:text-base text-gray-500">
            Costa Rica 2026
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-4 mb-8">
          {/* Question Selector */}
          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                  {questionLimit}
                </h2>
                <p className="text-sm text-gray-600">
                  preguntas
                </p>
              </div>

              <div className="flex-1 w-full">
                <input
                  type="range"
                  min={API_LIMITS.QUESTIONS.MIN}
                  max={API_LIMITS.QUESTIONS.MAX}
                  value={questionLimit}
                  onChange={(e) => setQuestionLimit(Number(e.target.value))}
                  className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-600 [&::-webkit-slider-thumb]:to-indigo-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                />
                <p className="text-xs text-gray-400 mt-2 text-center sm:text-right">
                  Desliza para ajustar
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleStart}
            disabled={isLoadingQuestions}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-base sm:text-lg py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
          >
            {isLoadingQuestions ? 'Cargando preguntas...' : 'Comenzar →'}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4 text-center hover:border-gray-300 transition-colors">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 tabular-nums">
              {questionLimit}
            </div>
            <div className="text-xs text-gray-500">
              Preguntas
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 text-center hover:border-blue-300 transition-colors">
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1 tabular-nums">
              {POLICY_AREAS.length}
            </div>
            <div className="text-xs text-blue-700">
              Áreas
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4 text-center hover:border-gray-300 transition-colors">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 tabular-nums">
              ~{Math.ceil(questionLimit / 4)}
            </div>
            <div className="text-xs text-gray-500">
              Min
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Privado y seguro</span>
        </div>
      </div>
    </div>
    </>
  );
}
