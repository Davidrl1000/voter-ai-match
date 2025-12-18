'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Header from '@/components/Header';
import InfoModal from '@/components/InfoModal';
import type { UserAnswer } from '@/lib/matching/algorithm';
import type { Question } from '@/lib/db/dynamodb';
import { API_LIMITS, QUESTION_OPTIONS } from '@/lib/constants';
import { Stage } from '@/lib/types/stage';
import type { Stage as StageType } from '@/lib/types/stage';
import { trackGTMEvent, GTMEvents } from '@/lib/gtm';
import { clearQuizResults, hasNavigatedToCandidates } from '@/lib/session-storage';

// Dynamically import heavy components to reduce initial bundle size
const Quiz = dynamic(() => import('@/components/Quiz'), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Cargando...</div>,
});

const Results = dynamic(() => import('@/components/Results'), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Cargando resultados...</div>,
});

interface CachedResults {
  matches: Array<{
    candidateId: string;
    name: string;
    party: string;
    score: number;
    matchedPositions: number;
    alignmentByArea: Record<string, number>;
  }>;
  aiExplanation: string;
}

export default function Home() {
  const [stage, setStage] = useState<StageType>(Stage.WELCOME);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [questionLimit, setQuestionLimit] = useState<number>(API_LIMITS.QUESTIONS.DEFAULT);
  const [preloadedQuestions, setPreloadedQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [cachedResults, setCachedResults] = useState<CachedResults | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cameFromCandidates = hasNavigatedToCandidates();
    const sessionData = sessionStorage.getItem('quiz_results');

    if (cameFromCandidates && sessionData) {
      try {
        const cached = JSON.parse(sessionData);
        setTimeout(() => {
          setAnswers(cached.answers);
          setCachedResults({
            matches: cached.matches,
            aiExplanation: cached.aiExplanation,
          });
          setStage(Stage.RESULTS);
        }, 0);
      } catch (error) {
        console.error('Error restoring session:', error);
      }
      return;
    }

    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const wasReloaded = navigationEntries.length > 0 && navigationEntries[0].type === 'reload';

    if (wasReloaded && !cameFromCandidates) {
      clearQuizResults();
    }
  }, []);

  const handleStart = useCallback(async () => {
    // Prevent double-clicks
    if (isLoadingQuestions) return;

    clearQuizResults();
    setIsLoadingQuestions(true);

    try {
      const response = await fetch(`/api/questions?limit=${questionLimit}`);
      const data = await response.json();

      setPreloadedQuestions(data.questions);
      setIsLoadingQuestions(false);
      setStage(Stage.QUIZ);

      trackGTMEvent(GTMEvents.HOME_START_QUIZ, {
        question_count: questionLimit,
      });
      trackGTMEvent(GTMEvents.QUIZ_STARTED, {
        question_count: questionLimit,
      });
    } catch (error) {
      console.error('Error loading questions:', error);
      setIsLoadingQuestions(false);
    }
  }, [isLoadingQuestions, questionLimit]);

  const handleComplete = useCallback((userAnswers: UserAnswer[]) => {
    setAnswers(userAnswers);
    setStage(Stage.RESULTS);
  }, []);

  const handleRestart = useCallback(() => {
    clearQuizResults();
    setAnswers([]);
    setCachedResults(null);
    setStage(Stage.WELCOME);
  }, []);

  const handleQuestionLimitChange = useCallback((count: number, label: string) => {
    setQuestionLimit(count);

    // Track (GTM is non-blocking internally)
    trackGTMEvent(GTMEvents.HOME_QUESTION_COUNT_SELECTED, {
      count,
      label,
    });
  }, []);

  const handleOpenPrivacyModal = useCallback(() => {
    setShowPrivacyModal(true);
    trackGTMEvent(GTMEvents.SECURITY_MESSAGE_SHOWN);
  }, []);

  const handleClosePrivacyModal = useCallback(() => {
    setShowPrivacyModal(false);
    trackGTMEvent(GTMEvents.SECURITY_MESSAGE_CLOSED);
  }, []);

  if (stage === Stage.QUIZ) {
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

  if (stage === Stage.RESULTS) {
    return (
      <>
        <Header />
        <Results
          answers={answers}
          onRestart={handleRestart}
          cachedResults={cachedResults}
        />
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

          <p className="text-sm sm:text-base text-gray-600">
            Costa Rica 2026
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-4 mb-8">
          {/* Question Selector */}
          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Elige la cantidad de preguntas
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {QUESTION_OPTIONS.map((option) => (
                <button
                  key={option.count}
                  onClick={() => handleQuestionLimitChange(option.count, option.label)}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-200
                    ${questionLimit === option.count
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {option.count}
                    </div>
                    <div className={`text-sm font-medium mb-1 ${questionLimit === option.count ? 'text-blue-600' : 'text-gray-700'}`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-600">
                      {option.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleStart}
            disabled={isLoadingQuestions}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-base sm:text-lg py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoadingQuestions ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Cargando preguntas...</span>
              </>
            ) : (
              <>
                <span>Comenzar</span>
                <Image
                  src="/assets/icons/arrow-right.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="w-5 h-5 brightness-0 invert"
                />
              </>
            )}
          </button>
        </div>

        {/* Privacy Note */}
        <button
          onClick={handleOpenPrivacyModal}
          className="flex items-center justify-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors cursor-pointer mx-auto"
        >
          <div className="w-3.5 h-3.5">
            <Image
              src="/assets/icons/lock.svg"
              alt="Candado"
              width={14}
              height={14}
              className="w-full h-full"
            />
          </div>
          <span className="underline decoration-dotted underline-offset-2">Privado y seguro</span>
        </button>

        {/* Privacy Modal */}
        <InfoModal
          isOpen={showPrivacyModal}
          onClose={handleClosePrivacyModal}
          title="Privado y Seguro"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center p-2">
                <Image
                  src="/assets/icons/lock.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="w-full h-full brightness-0 invert"
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Tus datos no se guardan</h3>
                <p className="text-sm text-gray-600">
                  Todas tus respuestas se procesan localmente en tu navegador. No guardamos tu información personal ni tus respuestas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center p-2">
                <Image
                  src="/assets/icons/security.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="w-full h-full brightness-0 invert"
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">100% anónimo</h3>
                <p className="text-sm text-gray-600">
                  No te pedimos correo, nombre ni información de contacto. Tu identidad permanece completamente anónima.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center p-2">
                <Image
                  src="/assets/icons/clipboard-check.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="w-full h-full brightness-0 invert"
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Datos técnicos anónimos</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Recopilamos datos técnicos anónimos (páginas visitadas, clics, tiempo de uso, tipo de dispositivo) mediante herramientas de análisis web estándar para mejorar la experiencia del usuario.
                </p>
                <p className="text-sm text-gray-600">
                  Estos datos nunca se vinculan con tu identidad ni con tus respuestas del cuestionario. Tus respuestas permanecen completamente privadas y anónimas.
                </p>
              </div>
            </div>
          </div>
        </InfoModal>
      </div>
    </div>
    </>
  );
}
