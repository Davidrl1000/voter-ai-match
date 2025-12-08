'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

interface TopResult {
  rank: number;
  percentage: number;
  count: number;
}

interface StatsData {
  totalMatches: number;
  averageQuestions: number;
  topResults: TopResult[];
}

export function AggregatedStatsWidget() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/aggregated-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    // Fetch stats on mount and set up refresh interval
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (!stats || stats.totalMatches === 0) {
    return null; // Don't show widget if no data
  }

  return (
    <>
      {/* Floating Bubble Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchStats(); // Refresh stats when opening
        }}
        className="fixed bottom-[72px] right-4 z-40 w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center justify-center cursor-pointer"
        aria-label="Ver estadísticas agregadas"
      >
        <Image
          src="/assets/icons/stats-chart.svg"
          alt=""
          width={20}
          height={20}
          className="brightness-0 invert"
        />
      </button>

      {/* Stats Panel */}
      {isOpen && (
        <>
          {/* Backdrop - subtle blur */}
          <div
            className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 cursor-pointer"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed bottom-[88px] right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image
                    src="/assets/icons/ai-sparkle.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="brightness-0 invert"
                  />
                  <h3 className="font-semibold text-lg">Estadísticas en Vivo</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/20 rounded-full p-1 transition-colors cursor-pointer"
                  aria-label="Cerrar"
                >
                  <Image
                    src="/assets/icons/close.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="brightness-0 invert"
                  />
                </button>
              </div>
              <p className="text-blue-100 text-sm mt-1">
                Los resultados se revelarán el día de las elecciones en cuanto se cierren las urnas
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Top Results with Scroll */}
              <div className="max-h-[360px] overflow-y-auto space-y-3 pr-2">
                {stats.topResults.map((result) => (
                  <div
                    key={result.rank}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    {/* Rank Badge */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-full text-sm">
                        #{result.rank}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Candidato #{result.rank}
                        </div>
                        <div className="text-xs text-gray-500">
                          {result.count.toLocaleString()} coincidencias
                        </div>
                      </div>
                    </div>

                    {/* Percentage */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {result.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Note */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Los resultados son anónimos y representan las preferencias agregadas de todos los usuarios.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
