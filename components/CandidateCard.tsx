'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { getPhotoPath, getLogoPath } from '@/lib/candidate-assets';
import { trackGTMEvent, GTMEvents } from '@/lib/gtm';
import { partyToSlug } from '@/lib/utils';
import PositionsSection from './PositionsSection';
import StatsSection from './StatsSection';

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
  const cardRef = useRef<HTMLDivElement>(null);
  const hasHandledHash = useRef(false);
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

  // Close on ESC key
  useEffect(() => {
    if (!isExpanded) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isExpanded]);

  // Prevent body scroll when overlay is open (desktop only)
  useEffect(() => {
    if (isExpanded) {
      // Only prevent scroll on desktop (>= 640px)
      const mediaQuery = window.matchMedia('(min-width: 640px)');
      if (mediaQuery.matches) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExpanded]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsExpanded(false);
    }
  }, []);

  // Load positions data
  const loadPositions = useCallback(() => {
    if (!positions && !loadingPositions) {
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
    }
  }, [positions, loadingPositions, party, onPositionsLoaded]);

  // Check URL hash on mount to pre-expand card (only once)
  useEffect(() => {
    if (hasHandledHash.current) return;

    const hash = window.location.hash.slice(1); // Remove #
    if (hash === partySlug) {
      hasHandledHash.current = true;
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setIsExpanded(true);
        loadPositions();
        // Scroll to top of card after a brief delay
        setTimeout(() => {
          cardRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 100);
      }, 0);
    }
  }, [partySlug, loadPositions]);

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

    // Load positions when expanding
    if (newState) {
      loadPositions();
    }

    trackGTMEvent(GTMEvents.CANDIDATES_TILE_CLICKED, {
      candidateName: name,
      party,
      action: newState ? 'expandir_informacion' : 'colapsar_informacion',
    });
  }, [isExpanded, name, party, loadPositions]);

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
      {isExpanded && (
        <div className="sm:hidden overflow-hidden animate-expand">
          <div className="space-y-4 pt-2 pb-4 border-t border-gray-100">
            <PositionsSection
              loadingPositions={loadingPositions}
              positions={positions}
              expandedPositions={expandedPositions}
              togglePosition={togglePosition}
              variant="mobile"
            />

            {planStats && (
              <StatsSection planStats={planStats} variant="mobile" />
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
    {isExpanded && (
      <div
        onClick={handleBackdropClick}
        className="hidden sm:flex fixed inset-0 z-50 items-center justify-center p-4 bg-black/50 animate-fade-in"
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
            <PositionsSection
              loadingPositions={loadingPositions}
              positions={positions}
              expandedPositions={expandedPositions}
              togglePosition={togglePosition}
              variant="desktop"
            />

            {planStats && (
              <StatsSection planStats={planStats} variant="desktop" />
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
