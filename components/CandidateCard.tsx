'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getPhotoPath, getLogoPath } from '@/lib/candidate-assets';
import CandidatePositionsModal from './CandidatePositionsModal';

interface CandidateCardProps {
  name: string;
  party: string;
  plan: string;
  site: string;
}

// Dummy stats data - will be replaced with real data later
const DUMMY_STATS = {
  mostUsedWord: 'desarrollo',
  characterCount: 125430,
  wordCount: 18750,
  pageCount: 87,
};

export default function CandidateCard({ name, party, plan, site }: CandidateCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showPositionsModal, setShowPositionsModal] = useState(false);

  return (
    <>
      <div className="relative h-[420px] perspective-1000">
        <div
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front of Card */}
          <div className="absolute inset-0 backface-hidden bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex flex-col items-center text-center h-full">
              {/* Photo with Party Logo Badge */}
              <div className="relative mb-4">
                <div className="w-56 h-56 rounded-full overflow-hidden border-4 border-gray-100">
                  <Image
                    src={getPhotoPath(party)}
                    alt={name}
                    width={224}
                    height={224}
                    priority
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to placeholder if image doesn't exist
                      (e.target as HTMLImageElement).src = '/assets/photos/placeholder.jpg';
                    }}
                  />
                </div>
                {/* Party Logo Badge */}
                <div className="absolute bottom-0 right-0 w-14 h-14 rounded-full overflow-hidden border-2 border-white bg-white shadow-md">
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
              <h2 className="text-base font-semibold text-gray-900 mb-0.5">
                {name}
              </h2>
              <p className="text-xs text-gray-600 mb-3">
                {party}
              </p>

              {/* Action Buttons - 2x2 Grid */}
              <div className="grid grid-cols-2 gap-2 w-full mt-auto">
                <a
                  href={`/assets/docs/${plan}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-center"
                >
                  Plan de Gobierno
                </a>
                <a
                  href={site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
                >
                  Candidaturas
                </a>
                <button
                  onClick={() => setShowPositionsModal(true)}
                  className="px-3 py-2.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Ver Posiciones
                </button>
                <button
                  onClick={() => setIsFlipped(true)}
                  className="px-3 py-2.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Ver Estadísticas
                </button>
              </div>
            </div>
          </div>

          {/* Back of Card */}
          <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-5 rotate-y-180">
            <div className="flex flex-col h-full justify-between">
              {/* Header */}
              <div className="text-center">
                <h2 className="text-base font-semibold text-gray-900 mb-0.5">
                  Estadísticas del Plan
                </h2>
                <p className="text-xs text-gray-600">{party}</p>
              </div>

              {/* Stats - Inline Layout */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-600">Palabra más usada:</span>
                  <span className="text-sm font-semibold text-gray-900">{DUMMY_STATS.mostUsedWord}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-600">Caracteres:</span>
                  <span className="text-sm font-semibold text-gray-900">{DUMMY_STATS.characterCount.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-600">Palabras:</span>
                  <span className="text-sm font-semibold text-gray-900">{DUMMY_STATS.wordCount.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-600">Páginas:</span>
                  <span className="text-sm font-semibold text-gray-900">{DUMMY_STATS.pageCount}</span>
                </div>
              </div>

              {/* Back Button */}
              <button
                onClick={() => setIsFlipped(false)}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Positions Modal */}
      <CandidatePositionsModal
        isOpen={showPositionsModal}
        onClose={() => setShowPositionsModal(false)}
        partyName={party}
      />
    </>
  );
}
