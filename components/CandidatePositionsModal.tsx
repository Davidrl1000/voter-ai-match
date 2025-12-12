'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import InfoModal from './InfoModal';
import { POLICY_AREAS, POLICY_AREA_LABELS } from '@/lib/constants';
import { trackGTMEvent, GTMEvents } from '@/lib/gtm';

interface CandidatePositionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyName: string;
  cachedPositions?: Record<string, string> | null;
  onPositionsLoaded?: (positions: Record<string, string>) => void;
}

export default function CandidatePositionsModal({
  isOpen,
  onClose,
  partyName,
  cachedPositions,
  onPositionsLoaded
}: CandidatePositionsModalProps) {
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [positions, setPositions] = useState<Record<string, string> | null>(cachedPositions || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/positions?party=${encodeURIComponent(partyName)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }

      const data = await response.json();
      setPositions(data.positions);

      // Cache in parent component
      if (onPositionsLoaded) {
        onPositionsLoaded(data.positions);
      }
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError('No se pudieron cargar las posiciones');
    } finally {
      setIsLoading(false);
    }
  }, [partyName, onPositionsLoaded]);

  // Fetch positions when modal opens and no cached data exists
  useEffect(() => {
    if (isOpen && !positions && !isLoading) {
      fetchPositions();
    }

    // Track modal opened
    if (isOpen) {
      trackGTMEvent(GTMEvents.QUIZ_POSITIONS_OPENED, {
        party: partyName,
      });
    }
  }, [isOpen, positions, isLoading, fetchPositions, partyName]);

  const toggleArea = useCallback((area: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(area)) {
      newExpanded.delete(area);
    } else {
      newExpanded.add(area);
      // Track position viewed when expanded
      trackGTMEvent(GTMEvents.QUIZ_POSITION_VIEWED, {
        party: partyName,
        policyArea: area,
        policyAreaLabel: POLICY_AREA_LABELS[area],
      });
    }
    setExpandedAreas(newExpanded);
  }, [expandedAreas, partyName]);

  const handleClose = useCallback(() => {
    trackGTMEvent(GTMEvents.QUIZ_POSITIONS_CLOSED, {
      party: partyName,
    });
    onClose();
  }, [partyName, onClose]);

  return (
    <InfoModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Posiciones del Candidato"
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-600 mb-4">
          Posiciones de <span className="font-bold">{partyName}</span> en las 7 áreas clave:
        </p>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-sm text-gray-600">Cargando posiciones...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 text-center">{error}</p>
          </div>
        )}

        {/* Positions List */}
        {!isLoading && !error && positions && (
          <div className="space-y-2">
            {[...POLICY_AREAS]
              .sort((a, b) => POLICY_AREA_LABELS[a].localeCompare(POLICY_AREA_LABELS[b]))
              .map((area) => {
                const isExpanded = expandedAreas.has(area);
                const position = positions[area];

                return (
                  <div
                    key={area}
                    className="border border-blue-100 rounded-lg overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => toggleArea(area)}
                      aria-expanded={isExpanded}
                      aria-controls={`position-${area}`}
                      aria-label={`${isExpanded ? 'Ocultar' : 'Mostrar'} posición sobre ${POLICY_AREA_LABELS[area]}`}
                      className="w-full flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors cursor-pointer focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      <div className="flex items-center gap-3">
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
                      <div
                        className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      >
                        <Image
                          src="/assets/icons/info-circle.svg"
                          alt=""
                          width={16}
                          height={16}
                          className="opacity-60"
                        />
                      </div>
                    </button>

                    {/* Collapsible Description */}
                    <div
                      id={`position-${area}`}
                      role="region"
                      aria-labelledby={`position-${area}-button`}
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="p-4 bg-white border-t border-blue-100">
                        {position ? (
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {position}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            No hay información disponible para esta área
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Disclaimer */}
        {!isLoading && !error && positions && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              Posiciones resumidas mediante análisis con IA del plan de gobierno. Para detalles completos, revise los documentos oficiales del candidato.
            </p>
          </div>
        )}
      </div>
    </InfoModal>
  );
}
