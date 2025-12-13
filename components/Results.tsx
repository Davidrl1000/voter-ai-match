'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { UserAnswer } from '@/lib/matching/algorithm';
import { POLICY_AREA_LABELS } from '@/lib/constants';
import { getPhotoPath } from '@/lib/candidate-assets';
import { trackGTMEvent, GTMEvents } from '@/lib/gtm';
import LoadingSpinner from './LoadingSpinner';

interface CandidateMatch {
  candidateId: string;
  name: string;
  party: string;
  score: number;
  matchedPositions: number;
  alignmentByArea: Record<string, number>;
}

interface ResultsProps {
  answers: UserAnswer[];
  onRestart: () => void;
}

/**
 * Format score with one decimal place for better differentiation
 * Shows 99.7% instead of 100% to maintain clarity between close scores
 */
function formatScore(score: number): string {
  return score.toFixed(1);
}

export default function Results({ answers, onRestart }: ResultsProps) {
  const [matches, setMatches] = useState<CandidateMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const hasStreamedRef = useRef(false);
  const hasCalculatedRef = useRef(false);

  const streamExplanation = useCallback(async (matchesData: CandidateMatch[]) => {
    // Prevent multiple requests
    if (hasStreamedRef.current) return;
    hasStreamedRef.current = true;

    setIsStreaming(true);
    setAiExplanation('');

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matches: matchesData,
          questionCount: answers.length,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate explanation');
      }

      const data = await response.json();
      const explanation = data.explanation || '';

      // Client-side streaming simulation (Amplify buffers real SSE)
      let currentIndex = 0;

      const streamNextChunk = () => {
        if (currentIndex >= explanation.length) {
          setIsStreaming(false);
          return;
        }

        // Stream 1-2 characters for natural flow
        const chunkSize = Math.random() > 0.7 ? 2 : 1;
        currentIndex += chunkSize;

        setAiExplanation(explanation.substring(0, currentIndex));

        // Variable timing for natural feel
        const char = explanation[currentIndex - 1];
        let delay = 20; // Base speed

        if (char === ' ') delay = 15; // Faster through spaces
        else if (['.', '!', '?', ':'].includes(char)) delay = 150; // Pause at sentence ends
        else if ([',', ';'].includes(char)) delay = 80; // Brief pause at commas

        setTimeout(streamNextChunk, delay);
      };

      streamNextChunk();

      // Track AI explanation shown (track when streaming starts)
      trackGTMEvent(GTMEvents.RESULTS_AI_EXPLANATION_SHOWN, {
        questionCount: answers.length,
        topMatchName: matchesData[0]?.name,
        topMatchScore: matchesData[0]?.score,
      });
    } catch (err) {
      console.error('Error streaming explanation:', err);
      setIsStreaming(false);
      hasStreamedRef.current = false;
    }
  }, [answers.length]);

  const handleRestart = useCallback(() => {
    trackGTMEvent(GTMEvents.RESULTS_RESTART_CLICKED, {
      questionCount: answers.length,
    });
    onRestart();
  }, [answers.length, onRestart]);

  const handleViewAllCandidates = useCallback(() => {
    trackGTMEvent(GTMEvents.RESULTS_VIEW_ALL_CANDIDATES);
  }, []);

  // Memoize candidate cards to prevent re-renders during AI streaming
  // Must be before early returns to satisfy React Hooks rules
  const topMatch = matches[0];

  const topMatchCard = useMemo(() => {
    if (!topMatch) return null;

    return (
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          {/* Candidate Photo */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-white/20">
              <Image
                src={getPhotoPath(topMatch.party)}
                alt={topMatch.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* Candidate Info */}
          <div className="flex-1">
            <p className="text-blue-100 text-xs uppercase tracking-wide mb-1">
              Tu mejor coincidencia
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold">{topMatch.name}</h2>
            <p className="text-blue-100 mt-1 text-sm">{topMatch.party}</p>
          </div>

          {/* Score */}
          <div className="text-left sm:text-right">
            <div className="text-4xl sm:text-5xl font-bold tabular-nums">{formatScore(topMatch.score)}%</div>
            <p className="text-blue-100 text-xs mt-1">Compatibilidad</p>
          </div>
        </div>

        <div className="border-t border-blue-400 pt-4">
          <p className="text-xs text-blue-100 mb-3">Alineación por área:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(topMatch.alignmentByArea).map(([area, score]) => (
              <div key={area} className="flex justify-between items-center text-sm">
                <span className="text-blue-50">{POLICY_AREA_LABELS[area] || area}</span>
                <span className="font-semibold tabular-nums">{formatScore(score)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [topMatch]);

  const otherMatchesCards = useMemo(() => {
    return matches.slice(1).map((match, index) => (
      <div
        key={match.candidateId}
        className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
      >
        <div className="flex items-start gap-4 mb-3">
          {/* Candidate Photo with Ranking Badge */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-gray-200">
              <Image
                src={getPhotoPath(match.party)}
                alt={match.name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            {/* Ranking Number */}
            <div className="absolute -top-1 -left-1 w-7 h-7 flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-full text-sm shadow-md">
              {index + 2}
            </div>
          </div>

          {/* Candidate Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">{match.name}</h3>
            <p className="text-gray-600 text-sm mb-2">{match.party}</p>

            {/* Progress Bar */}
            <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden mb-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all"
                style={{ width: `${match.score}%` }}
              ></div>
            </div>

            {/* Top Areas */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(match.alignmentByArea)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([area, score]) => (
                  <span
                    key={area}
                    className="px-2.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-blue-700 text-xs font-medium rounded-full"
                  >
                    {POLICY_AREA_LABELS[area]}: {formatScore(score)}%
                  </span>
                ))}
            </div>
          </div>

          {/* Score */}
          <span className="text-xl font-bold text-gray-900 tabular-nums flex-shrink-0">
            {formatScore(match.score)}%
          </span>
        </div>
      </div>
    ));
  }, [matches]);

  useEffect(() => {
    async function calculateMatches() {
      // Prevent duplicate calculations (React StrictMode in dev calls effects twice)
      if (hasCalculatedRef.current) return;
      hasCalculatedRef.current = true;

      try {
        const response = await fetch('/api/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ answers }),
        });

        if (!response.ok) {
          throw new Error('Failed to calculate matches');
        }

        const data = await response.json();
        setMatches(data.matches);
        setLoading(false);

        if (data.matches.length > 0) {
          // Track results viewed
          trackGTMEvent(GTMEvents.RESULTS_VIEWED, {
            topMatchName: data.matches[0]?.name,
            topMatchScore: data.matches[0]?.score,
            questionCount: answers.length,
            totalCandidates: data.matches.length,
          });

          streamExplanation(data.matches);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error calculating matches');
        setLoading(false);
        hasCalculatedRef.current = false; // Reset on error to allow retry
      }
    }

    calculateMatches();
  }, [answers, streamExplanation]);

  if (loading) {
    return <LoadingSpinner message="Calculando tus resultados..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={onRestart}
            className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors w-full sm:w-auto"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Tus Resultados
          </h1>
          <p className="text-sm text-gray-600">
            Basado en {answers.length} respuestas
          </p>
        </div>

        {/* AI Explanation - Conditionally rendered */}
        {(aiExplanation || isStreaming) && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-700">

          <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 border-2 border-blue-100 rounded-xl p-6 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-5 h-5 ${isStreaming && !aiExplanation ? 'animate-pulse' : ''}`}>
                <Image
                  src="/assets/icons/ai-sparkle.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="w-full h-full"
                />
              </div>
              <h2 className="text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Análisis con IA
              </h2>
              {isStreaming && !aiExplanation && (
                <span className="ml-auto flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-xs font-medium text-blue-600">Generando...</span>
                </span>
              )}
            </div>

            {/* Loading State - Before content starts */}
            {isStreaming && !aiExplanation && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <div className="flex-shrink-0">
                    <div className="relative w-10 h-10">
                      <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      Analizando tus respuestas...
                    </p>
                    <p className="text-xs text-gray-600">
                      La IA está comparando tus posiciones con los candidatos
                    </p>
                  </div>
                </div>

                {/* Skeleton loading bars */}
                <div className="space-y-2 px-1">
                  <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse" style={{ width: '95%' }}></div>
                  <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse" style={{ width: '88%', animationDelay: '75ms' }}></div>
                  <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse" style={{ width: '92%', animationDelay: '150ms' }}></div>
                </div>
              </div>
            )}

            {/* Streaming/Final Content */}
            {aiExplanation && (
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {aiExplanation}
                {isStreaming && (
                  <span className="relative top-[3px] inline-block w-0.5 h-4 bg-blue-600 ml-0.5 animate-pulse"></span>
                )}
              </div>
            )}
          </div>
          </div>
        )}

        {/* Top Match */}
        {topMatchCard}

        {/* Other Matches */}
        <div className="space-y-3">
          {otherMatchesCards}
        </div>

        {/* Actions */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all hover:scale-[1.01] active:scale-[0.99] w-full sm:w-auto"
            >
              Volver a empezar
            </button>
            <Link
              href="/candidates"
              onClick={handleViewAllCandidates}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-all hover:scale-[1.01] active:scale-[0.99] w-full sm:w-auto inline-flex items-center justify-center"
            >
              Ver todos los candidatos
            </Link>
          </div>
          <p className="text-xs text-gray-500">
            Estos resultados son solo una guía. Investiga a cada candidato antes de votar.
          </p>
        </div>
      </div>
    </div>
  );
}
