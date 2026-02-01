'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface CandidateResult {
  candidateId: string;
  name: string;
  party: string;
  partyColor: string;
  sitePercentage: number;
  nationalPercentage: number | null;
}

interface ElectionResultsData {
  showNationalResults: boolean;
  totalParticipants: number;
  lastUpdated: string;
  results: CandidateResult[];
}

export default function ElectionResultsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<ElectionResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Control widget visibility via env variable
  const showWidget = process.env.NEXT_PUBLIC_SHOW_RESULTS_WIDGET === 'true';

  useEffect(() => {
    if (!showWidget) return;

    async function fetchData() {
      try {
        const response = await fetch('/api/election-results');
        if (!response.ok) {
          throw new Error('Failed to fetch election results');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [showWidget]);

  const openModal = useCallback(() => {
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = '';
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString('es-CR');
  };

  // Don't render if disabled or no data
  if (!showWidget || isLoading || error || !data || data.totalParticipants === 0) {
    return null;
  }

  const maxPercentage = Math.max(
    ...data.results.map((r) => Math.max(r.sitePercentage, r.nationalPercentage || 0))
  );

  return (
    <>
      {/* Trigger Button - Centered */}
      <div className="flex justify-center mb-4">
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer"
        >
          <Image
            src="/assets/icons/chart-bar.svg"
            alt=""
            width={16}
            height={16}
            className="brightness-0 invert"
          />
          <span>Ver resultados</span>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {formatNumber(data.totalParticipants)}
          </span>
        </button>
      </div>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={closeModal}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up-fade">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Image
                      src="/assets/icons/chart-bar.svg"
                      alt=""
                      width={24}
                      height={24}
                      className="brightness-0 invert"
                    />
                    Resultados Votante AI
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {formatNumber(data.totalParticipants)} participantes
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                  aria-label="Cerrar"
                >
                  <Image
                    src="/assets/icons/close.svg"
                    alt=""
                    width={18}
                    height={18}
                    className="brightness-0 invert"
                  />
                </button>
              </div>

              {/* Legend */}
              {data.showNationalResults && (
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-white" />
                    <span className="text-blue-100">Votante AI</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-white/40" />
                    <span className="text-blue-100">TSE</span>
                  </div>
                </div>
              )}
            </div>

            {/* Results List */}
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="p-4 space-y-1">
                {data.results.map((result, index) => (
                  <div
                    key={result.candidateId}
                    className="group p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {/* Candidate Info */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                          style={{ backgroundColor: result.partyColor }}
                        />
                        <span className="font-semibold text-gray-900 text-sm truncate">
                          {result.name}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          ({result.candidateId})
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 ml-2">
                        {result.sitePercentage.toFixed(1)}%
                      </span>
                    </div>

                    {/* Progress Bars */}
                    <div className="space-y-1.5">
                      {/* Votante AI Bar */}
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${maxPercentage > 0 ? (result.sitePercentage / maxPercentage) * 100 : 0}%`,
                            backgroundColor: result.partyColor,
                          }}
                        />
                      </div>

                      {/* TSE Bar (if enabled) */}
                      {data.showNationalResults && result.nationalPercentage !== null && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out bg-gray-400"
                              style={{
                                width: `${maxPercentage > 0 ? (result.nationalPercentage / maxPercentage) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-12 text-right">
                            {result.nationalPercentage.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                Porcentaje de usuarios que obtuvieron a cada candidato en Votante AI
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
