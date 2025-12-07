'use client';

import { useState } from 'react';
import Image from 'next/image';
import InfoModal from './InfoModal';
import { POLICY_AREAS, POLICY_AREA_LABELS } from '@/lib/constants';

interface CandidatePositionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyName: string;
}

// Dummy position descriptions - will be replaced with real data later
const DUMMY_POSITIONS: Record<string, string> = {
  economy: 'Propone una reforma fiscal progresiva con énfasis en la reducción del déficit fiscal mediante la optimización del gasto público. Busca atraer inversión extranjera directa y fortalecer las pequeñas y medianas empresas con incentivos fiscales.',
  healthcare: 'Enfoque en la modernización del sistema de salud pública, reduciendo listas de espera mediante alianzas público-privadas. Prioriza la atención primaria y la prevención de enfermedades crónicas.',
  education: 'Propone aumentar la inversión en educación técnica y capacitación digital. Busca reducir la brecha educativa entre zonas urbanas y rurales mediante infraestructura tecnológica.',
  security: 'Plantea fortalecer la policía comunitaria y aumentar la presencia policial en zonas de alta criminalidad. Enfoque en prevención del delito mediante programas sociales para jóvenes en riesgo.',
  environment: 'Compromiso con la carbono neutralidad y la protección de áreas protegidas. Propone incentivos para energías renovables y transporte público eléctrico.',
  social: 'Enfoque en programas de combate a la pobreza mediante empleo digno. Propone fortalecer redes de cuido y apoyo a familias vulnerables con transferencias condicionadas.',
  infrastructure: 'Plan de modernización vial con énfasis en carreteras cantonales y puentes. Propone concesiones público-privadas para grandes obras de infraestructura nacional.',
};

export default function CandidatePositionsModal({ isOpen, onClose, partyName }: CandidatePositionsModalProps) {
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  const toggleArea = (area: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(area)) {
      newExpanded.delete(area);
    } else {
      newExpanded.add(area);
    }
    setExpandedAreas(newExpanded);
  };

  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      title="Posiciones del Candidato"
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-600 mb-4">
          Posiciones de <span className="font-bold">{partyName}</span> en las 7 áreas clave:
        </p>
        <div className="space-y-2">
          {[...POLICY_AREAS]
            .sort((a, b) => POLICY_AREA_LABELS[a].localeCompare(POLICY_AREA_LABELS[b]))
            .map((area) => {
              const isExpanded = expandedAreas.has(area);
              return (
                <div
                  key={area}
                  className="border border-blue-100 rounded-lg overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleArea(area)}
                    className="w-full flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors cursor-pointer"
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
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="p-4 bg-white border-t border-blue-100">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {DUMMY_POSITIONS[area]}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Disclaimer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            Posiciones resumidas mediante análisis con IA del plan de gobierno. Para detalles completos, revise los documentos oficiales del candidato.
          </p>
        </div>
      </div>
    </InfoModal>
  );
}
