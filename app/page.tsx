'use client';

import { useState } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import Quiz from '@/components/Quiz';
import Results from '@/components/Results';
import InfoModal from '@/components/InfoModal';
import type { UserAnswer } from '@/lib/matching/algorithm';
import type { Question } from '@/lib/db/dynamodb';
import { API_LIMITS, POLICY_AREAS, POLICY_AREA_LABELS, QUESTION_OPTIONS } from '@/lib/constants';
import { Stage } from '@/lib/types/stage';
import type { Stage as StageType } from '@/lib/types/stage';
import { trackGTMEvent, GTMEvents } from '@/lib/gtm';

export default function Home() {
  const [stage, setStage] = useState<StageType>(Stage.WELCOME);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [questionLimit, setQuestionLimit] = useState<number>(API_LIMITS.QUESTIONS.DEFAULT);
  const [preloadedQuestions, setPreloadedQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [showAreasModal, setShowAreasModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleStart = async () => {
    setIsLoadingQuestions(true);

    // Track quiz start
    trackGTMEvent(GTMEvents.HOME_START_QUIZ, {
      question_count: questionLimit,
    });

    try {
      const response = await fetch(`/api/questions?limit=${questionLimit}`);
      const data = await response.json();

      setPreloadedQuestions(data.questions);
      setIsLoadingQuestions(false);
      setStage(Stage.QUIZ);

      // Track quiz started
      trackGTMEvent(GTMEvents.QUIZ_STARTED, {
        question_count: questionLimit,
      });
    } catch (error) {
      console.error('Error loading questions:', error);
      setIsLoadingQuestions(false);
    }
  };

  const handleComplete = (userAnswers: UserAnswer[]) => {
    setAnswers(userAnswers);
    setStage(Stage.RESULTS);
  };

  const handleRestart = () => {
    setAnswers([]);
    setStage(Stage.WELCOME);
  };

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
            <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Elige la cantidad de preguntas
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {QUESTION_OPTIONS.map((option) => (
                <button
                  key={option.count}
                  onClick={() => {
                    setQuestionLimit(option.count);
                    trackGTMEvent('home_question_count_selected', {
                      count: option.count,
                      label: option.label,
                    });
                  }}
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
                    <div className="text-xs text-gray-500">
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

          <button
            onClick={() => {
              setShowAreasModal(true);
              trackGTMEvent('home_policy_areas_opened');
            }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 text-center hover:border-blue-300 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1 tabular-nums">
              {POLICY_AREAS.length}
            </div>
            <div className="text-xs text-blue-700 flex items-center justify-center gap-1">
              <span>Áreas</span>
              <div className="w-3 h-3">
                <Image
                  src="/assets/icons/info-circle.svg"
                  alt="Información"
                  width={12}
                  height={12}
                  className="w-full h-full"
                />
              </div>
            </div>
          </button>

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
        <button
          onClick={() => {
            setShowPrivacyModal(true);
            trackGTMEvent(GTMEvents.SECURITY_MESSAGE_SHOWN);
          }}
          className="flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer mx-auto"
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

        {/* Policy Areas Modal */}
        <InfoModal
          isOpen={showAreasModal}
          onClose={() => {
            setShowAreasModal(false);
            trackGTMEvent('home_policy_areas_closed');
          }}
          title="Áreas de Política"
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Analizamos tus respuestas en estas 7 áreas clave de política costarricense:
            </p>
            <div className="space-y-2">
              {[...POLICY_AREAS]
                .sort((a, b) => POLICY_AREA_LABELS[a].localeCompare(POLICY_AREA_LABELS[b]))
                .map((area) => (
                  <div
                    key={area}
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center p-1.5">
                      <Image
                        src={`/assets/icons/${area}.svg`}
                        alt=""
                        width={20}
                        height={20}
                        className="w-full h-full brightness-0 invert"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {POLICY_AREA_LABELS[area]}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </InfoModal>

        {/* Privacy Modal */}
        <InfoModal
          isOpen={showPrivacyModal}
          onClose={() => {
            setShowPrivacyModal(false);
            trackGTMEvent(GTMEvents.SECURITY_MESSAGE_CLOSED);
          }}
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
