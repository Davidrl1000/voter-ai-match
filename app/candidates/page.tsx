'use client';

import Image from 'next/image';
import Header from '@/components/Header';
import { getPhotoPath, getLogoPath } from '@/lib/candidate-assets';
import candidatesData from '@/data/candidates.json';

interface Candidate {
  name: string;
  party: string;
  plan: string;
  site: string;
}

export default function CandidatesPage() {
  const candidates: Candidate[] = candidatesData.map((c) => ({
    name: c.name,
    party: c.politicalParty,
    plan: c.plan,
    site: c.site,
  })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Candidatos 2026
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Conoce a todos los candidatos presidenciales de Costa Rica
            </p>
          </div>

          {/* Candidates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {candidates.map((candidate) => (
              <div
                key={candidate.name}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-all hover:scale-[1.02]"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Photo with Party Logo Badge */}
                  <div className="relative mb-4">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100">
                      <Image
                        src={getPhotoPath(candidate.party)}
                        alt={candidate.name}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to placeholder if image doesn't exist
                          (e.target as HTMLImageElement).src = '/assets/photos/placeholder.jpg';
                        }}
                      />
                    </div>
                    {/* Party Logo Badge */}
                    <div className="absolute bottom-0 right-0 w-10 h-10 rounded-full overflow-hidden border-2 border-white bg-white shadow-md">
                      <Image
                        src={getLogoPath(candidate.party)}
                        alt={candidate.party}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/assets/logos/placeholder.jpg';
                        }}
                      />
                    </div>
                  </div>

                  {/* Candidate Info */}
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {candidate.name}
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    {candidate.party}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 w-full">
                    <a
                      href={`/assets/docs/${candidate.plan}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-center"
                    >
                      Ver Plan de Gobierno
                    </a>
                    <a
                      href={candidate.site}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
                    >
                      Información Oficial
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <div className="mt-10 text-center">
            <p className="text-xs text-gray-500">
              La información presentada es únicamente informativa. Investiga a cada candidato antes de votar.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
