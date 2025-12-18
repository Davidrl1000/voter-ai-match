'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { getPhotoPath, getLogoPath } from '@/lib/candidate-assets';
import { trackGTMEvent, GTMEvents } from '@/lib/gtm';
import { POLICY_AREA_LABELS } from '@/lib/constants';

interface PdfStats {
  pageCount: number;
  wordCount: number;
  readingTimeMinutes: number;
  mostUsedWord: string;
}

interface CandidateCardProps {
  name: string;
  party: string;
  plan: string;
  site: string;
  planStats?: PdfStats;
  cachedPositions?: Record<string, string>;
  onPositionsLoaded?: (positions: Record<string, string>) => void;
}

/**
 * Format reading time into human-readable string
 */
function formatReadingTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.round(minutes / 6) / 10; // Round to 1 decimal
  return `${hours} hrs`;
}

/**
 * Convert party name to URL-safe slug
 */
function partyToSlug(party: string): string {
  return party
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

export default function CandidateCard({
  name,
  party,
  plan,
  site,
  planStats,
  cachedPositions,
  onPositionsLoaded
}: CandidateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [positions, setPositions] = useState<Record<string, string> | null>(cachedPositions || null);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [isDesktop, setIsDesktop] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const partySlug = partyToSlug(party);

  const togglePosition = useCallback((areaKey: string) => {
    setExpandedPositions(prev => {
      const next = new Set(prev);
      if (next.has(areaKey)) {
        next.delete(areaKey);
      } else {
        next.add(areaKey);
      }
      return next;
    });
  }, []);

  // Detect multi-column layout (sm breakpoint = 640px, when grid shows 2+ columns)
  useEffect(() => {
    const checkMultiColumn = () => setIsDesktop(window.innerWidth >= 640);
    checkMultiColumn();
    window.addEventListener('resize', checkMultiColumn);
    return () => window.removeEventListener('resize', checkMultiColumn);
  }, []);

  // Close on ESC key (desktop only)
  useEffect(() => {
    if (!isExpanded || !isDesktop) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isExpanded, isDesktop]);

  // Prevent body scroll when overlay is open (desktop only)
  useEffect(() => {
    if (isExpanded && isDesktop) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExpanded, isDesktop]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsExpanded(false);
    }
  }, []);

  // Check URL hash on mount to pre-expand card
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove #
    if (hash === partySlug) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setIsExpanded(true);
        // Scroll to card after a brief delay
        setTimeout(() => {
          cardRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }, 100);
      }, 0);
    }
  }, [partySlug]);

  // Load positions when expanded
  useEffect(() => {
    if (isExpanded && !positions && !loadingPositions) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setLoadingPositions(true);

        fetch(`/api/positions?party=${encodeURIComponent(party)}`)
          .then(res => res.json())
          .then(data => {
            if (data.positions) {
              setPositions(data.positions);
              onPositionsLoaded?.(data.positions);
            }
          })
          .catch(err => {
            console.error('Error loading positions:', err);
          })
          .finally(() => {
            setLoadingPositions(false);
          });
      }, 0);
    }
  }, [isExpanded, positions, loadingPositions, party, onPositionsLoaded]);

  const handlePlanClick = useCallback(() => {
    trackGTMEvent(GTMEvents.CANDIDATES_TILE_CLICKED, {
      candidateName: name,
      party,
      action: 'plan_gobierno',
    });
  }, [name, party]);

  const handleSiteClick = useCallback(() => {
    trackGTMEvent(GTMEvents.CANDIDATES_TILE_CLICKED, {
      candidateName: name,
      party,
      action: 'candidaturas',
    });
  }, [name, party]);

  const handleToggleExpand = useCallback(() => {
    const newState = !isExpanded;
    setIsExpanded(newState);

    trackGTMEvent(GTMEvents.CANDIDATES_TILE_CLICKED, {
      candidateName: name,
      party,
      action: newState ? 'expandir_informacion' : 'colapsar_informacion',
    });
  }, [isExpanded, name, party]);

  return (
    <>
    <div
      id={partySlug}
      ref={cardRef}
      className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 transition-all duration-300 hover:shadow-lg scroll-mt-24"
    >
      {/* Photo with Party Logo Badge */}
      <div className="relative mb-4 flex justify-center">
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-gray-100">
          <Image
            src={getPhotoPath(party)}
            alt={name}
            width={192}
            height={192}
            priority
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/photos/placeholder.jpg';
            }}
          />
        </div>
        {/* Party Logo Badge */}
        <div className="absolute bottom-0 right-1/2 translate-x-20 sm:translate-x-24 w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-white bg-white shadow-md">
          <Image
            src={getLogoPath(party)}
            alt={party}
            width={100}
            height={56}
            priority
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/logos/placeholder.jpg';
            }}
          />
        </div>
      </div>

      {/* Candidate Info */}
      <div className="text-center mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
          {name}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600">
          {party}
        </p>
      </div>

      {/* Primary Expand Button */}
      <button
        onClick={handleToggleExpand}
        className="w-full mb-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
      >
        <Image
          src={`/assets/icons/chevron-${isExpanded ? 'up' : 'down'}.svg`}
          alt=""
          width={20}
          height={20}
          className={`w-5 h-5 transition-transform duration-300 brightness-0 invert ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
        />
        <span className="transition-opacity duration-200">
          {isExpanded ? 'Ocultar información' : 'Ver información completa'}
        </span>
      </button>

      {/* Expanded Content - Mobile (in-place) */}
      {isExpanded && !isDesktop && (
        <div className="overflow-hidden animate-expand">
          <div className="space-y-4 pt-2 pb-4 border-t border-gray-100">

            {/* Positions Section */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Image
                  src="/assets/icons/map-pin.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
                <span>Posiciones Políticas</span>
              </h3>

              {loadingPositions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="relative w-8 h-8">
                    <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                </div>
              ) : positions ? (
                <div className="space-y-3">
                  {Object.entries(POLICY_AREA_LABELS).map(([areaKey, areaLabel]) => {
                    const position = positions[areaKey];
                    if (!position) return null;

                    const isPositionExpanded = expandedPositions.has(areaKey);
                    const isTruncated = position.length > 150;

                    return (
                      <div key={areaKey} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center p-1">
                            <Image
                              src={`/assets/icons/${areaKey}.svg`}
                              alt=""
                              width={16}
                              height={16}
                              className="w-full h-full brightness-0 invert"
                            />
                          </div>
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-900">
                            {areaLabel}
                          </h4>
                        </div>
                        <p className={`text-xs sm:text-sm text-gray-700 leading-relaxed ${!isPositionExpanded && isTruncated ? 'line-clamp-3' : ''}`}>
                          {position}
                        </p>
                        {isTruncated && (
                          <button
                            onClick={() => togglePosition(areaKey)}
                            className="mt-2 text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors cursor-pointer"
                          >
                            {isPositionExpanded ? 'Ver menos' : 'Ver más'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-gray-500 text-center py-4">
                  No hay posiciones disponibles
                </p>
              )}
            </div>

            {/* Stats Section */}
            {planStats && (
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Image
                    src="/assets/icons/chart-bar.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  <span>Estadísticas del Plan</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Tiempo de lectura</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">
                      {formatReadingTime(planStats.readingTimeMinutes)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Páginas</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">
                      {planStats.pageCount}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Término más usado</p>
                    <p className="text-sm sm:text-base font-bold text-gray-900 capitalize truncate">
                      {planStats.mostUsedWord}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Palabras</p>
                    <p className="text-sm sm:text-base font-bold text-gray-900">
                      {planStats.wordCount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Secondary Actions */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`/assets/docs/${plan}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handlePlanClick}
          className="px-3 py-2.5 sm:py-3 bg-white border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors text-center active:scale-[0.98] flex items-center justify-center"
        >
          Plan de Gobierno
        </a>
        <a
          href={site}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleSiteClick}
          className="px-3 py-2.5 sm:py-3 bg-white border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors text-center active:scale-[0.98] flex items-center justify-center"
        >
          Candidaturas
        </a>
      </div>
    </div>

    {/* Desktop Overlay Mode */}
    {isExpanded && isDesktop && (
      <div
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up-fade"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between rounded-t-xl z-1">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                <Image
                  src={getPhotoPath(party)}
                  alt={name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/photos/placeholder.jpg';
                  }}
                />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">{name}</h2>
                <p className="text-sm text-gray-600">{party}</p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <span className="text-2xl text-gray-500">×</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-6">
            {/* Positions Section */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Image
                  src="/assets/icons/map-pin.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <span>Posiciones Políticas</span>
              </h3>

              {loadingPositions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                </div>
              ) : positions ? (
                <div className="space-y-3">
                  {Object.entries(POLICY_AREA_LABELS).map(([areaKey, areaLabel]) => {
                    const position = positions[areaKey];
                    if (!position) return null;

                    const isPositionExpanded = expandedPositions.has(areaKey);
                    const isTruncated = position.length > 150;

                    return (
                      <div key={areaKey} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center p-1.5">
                            <Image
                              src={`/assets/icons/${areaKey}.svg`}
                              alt=""
                              width={18}
                              height={18}
                              className="w-full h-full brightness-0 invert"
                            />
                          </div>
                          <h4 className="text-sm sm:text-base font-semibold text-gray-900">
                            {areaLabel}
                          </h4>
                        </div>
                        <p className={`text-sm text-gray-700 leading-relaxed ${!isPositionExpanded && isTruncated ? 'line-clamp-3' : ''}`}>
                          {position}
                        </p>
                        {isTruncated && (
                          <button
                            onClick={() => togglePosition(areaKey)}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors cursor-pointer"
                          >
                            {isPositionExpanded ? 'Ver menos' : 'Ver más'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  No hay posiciones disponibles
                </p>
              )}
            </div>

            {/* Stats Section */}
            {planStats && (
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Image
                    src="/assets/icons/chart-bar.svg"
                    alt=""
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span>Estadísticas del Plan</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Tiempo de lectura</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">
                      {formatReadingTime(planStats.readingTimeMinutes)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Páginas</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">
                      {planStats.pageCount}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Término más usado</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900 capitalize truncate">
                      {planStats.mostUsedWord}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Palabras</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">
                      {planStats.wordCount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`/assets/docs/${plan}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handlePlanClick}
                  className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-center active:scale-[0.98]"
                >
                  Plan de Gobierno
                </a>
                <a
                  href={site}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleSiteClick}
                  className="px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-all text-center active:scale-[0.98]"
                >
                  Candidaturas
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
