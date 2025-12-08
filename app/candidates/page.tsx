'use client';

import { useMemo } from 'react';
import Header from '@/components/Header';
import CandidateCard from '@/components/CandidateCard';
import candidatesData from '@/data/candidates.json';

interface PdfStats {
  pageCount: number;
  wordCount: number;
  readingTimeMinutes: number;
  mostUsedWord: string;
}

interface Candidate {
  name: string;
  party: string;
  plan: string;
  site: string;
  planStats?: PdfStats;
}

export default function CandidatesPage() {
  const candidates: Candidate[] = useMemo(() => {
    return candidatesData.map((c) => ({
      name: c.name,
      party: c.politicalParty,
      plan: c.plan,
      site: c.site,
      planStats: c.planStats,
    })).sort((a, b) => a.party.localeCompare(b.party));
  }, []);

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
              <CandidateCard
                key={candidate.name}
                name={candidate.name}
                party={candidate.party}
                plan={candidate.plan}
                site={candidate.site}
                planStats={candidate.planStats}
              />
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
