'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import type { UserAnswer } from '@/lib/matching/algorithm';
import { POLICY_AREA_LABELS } from '@/lib/constants';
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

export default function Results({ answers, onRestart }: ResultsProps) {
  const [matches, setMatches] = useState<CandidateMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const hasStreamedRef = useRef(false);

  const streamExplanation = useCallback(async (matchesData: CandidateMatch[]) => {
    // Prevent multiple streams
    if (hasStreamedRef.current) return;
    hasStreamedRef.current = true;

    setIsStreaming(true);
    setAiExplanation(''); // Reset explanation

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

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      // By updating state directly, we keep the component declarative and robust.
      // React 18+ batches these updates, so performance is excellent.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        setAiExplanation((prev) => prev + text);
      }

      setIsStreaming(false);
    } catch (err) {
      console.error('Error streaming explanation:', err);
      setIsStreaming(false);
      hasStreamedRef.current = false; // Reset on error
    }
  }, [answers.length]);

  useEffect(() => {
    async function calculateMatches() {
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
          streamExplanation(data.matches);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error calculating matches');
        setLoading(false);
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

  const topMatch = matches[0];

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

        {/* AI Explanation - Always rendered to prevent page jump */}
        <div
          className={`mb-6 transition-all duration-700 ease-out ${
            aiExplanation || isStreaming
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-4 max-h-0 overflow-hidden'
          }`}
          style={{
            maxHeight: aiExplanation || isStreaming ? '1000px' : '0',
            transition: 'opacity 0.5s ease-out, transform 0.5s ease-out, max-height 0.7s ease-out'
          }}
        >
          <div className="bg-white border border-gray-200 rounded-xl p-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5">
                <Image
                  src="/assets/icons/ai-sparkle.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="w-full h-full"
                />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                Análisis con IA
              </h2>
              {isStreaming && (
                <span className="ml-auto text-xs text-blue-600">
                  Analizando...
                </span>
              )}
            </div>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {aiExplanation}
              {isStreaming && aiExplanation && (
                <span className="inline-block w-0.5 h-4 bg-blue-600 ml-0.5 animate-pulse"></span>
              )}
            </div>
          </div>
        </div>

        {/* Top Match */}
        {topMatch && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex-1">
                <p className="text-blue-100 text-xs uppercase tracking-wide mb-1">
                  Tu mejor coincidencia
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold">{topMatch.name}</h2>
                <p className="text-blue-100 mt-1 text-sm">{topMatch.party}</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-4xl sm:text-5xl font-bold tabular-nums">{Math.round(topMatch.score)}%</div>
                <p className="text-blue-100 text-xs mt-1">Compatibilidad</p>
              </div>
            </div>

            <div className="border-t border-blue-400 pt-4">
              <p className="text-xs text-blue-100 mb-3">Alineación por área:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(topMatch.alignmentByArea).map(([area, score]) => (
                  <div key={area} className="flex justify-between items-center text-sm">
                    <span className="text-blue-50">{POLICY_AREA_LABELS[area] || area}</span>
                    <span className="font-semibold tabular-nums">{Math.round(score)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Other Matches */}
        <div className="space-y-3">
          {matches.slice(1).map((match, index) => (
            <div
              key={match.candidateId}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-700 font-semibold rounded-full text-sm flex-shrink-0">
                  {index + 2}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900">{match.name}</h3>
                  <p className="text-gray-600 text-sm">{match.party}</p>
                </div>
                <span className="text-xl font-bold text-gray-900 tabular-nums">
                  {Math.round(match.score)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden mb-3">
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
                      {POLICY_AREA_LABELS[area]}: {Math.round(score)}%
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 text-center space-y-4">
          <button
            onClick={onRestart}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all hover:scale-[1.01] active:scale-[0.99] w-full sm:w-auto"
          >
            Volver a empezar
          </button>
          <p className="text-xs text-gray-500">
            Estos resultados son solo una guía. Investiga a cada candidato antes de votar.
          </p>
        </div>
      </div>
    </div>
  );
}
