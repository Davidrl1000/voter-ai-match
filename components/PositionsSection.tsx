import Image from 'next/image';
import { POLICY_AREA_LABELS } from '@/lib/constants';

interface PositionsSectionProps {
  loadingPositions: boolean;
  positions: Record<string, string> | null;
  expandedPositions: Set<string>;
  togglePosition: (areaKey: string) => void;
  variant?: 'mobile' | 'desktop';
}

export default function PositionsSection({
  loadingPositions,
  positions,
  expandedPositions,
  togglePosition,
  variant = 'mobile'
}: PositionsSectionProps) {
  const isMobile = variant === 'mobile';

  return (
    <div>
      <h3 className={`${isMobile ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} font-semibold text-gray-900 ${isMobile ? 'mb-3' : 'mb-4'} flex items-center gap-2`}>
        <Image
          src="/assets/icons/map-pin.svg"
          alt=""
          width={isMobile ? 20 : 24}
          height={isMobile ? 20 : 24}
          className={isMobile ? 'w-5 h-5' : 'w-6 h-6'}
        />
        <span>Posiciones Políticas</span>
      </h3>

      {loadingPositions ? (
        <div className={`flex items-center justify-center ${isMobile ? 'py-8' : 'py-12'}`}>
          <div className={`relative ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}>
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
              <div key={areaKey} className={`bg-gray-50 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`flex-shrink-0 ${isMobile ? 'w-6 h-6 p-1' : 'w-7 h-7 p-1.5'} bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center`}>
                    <Image
                      src={`/assets/icons/${areaKey}.svg`}
                      alt=""
                      width={isMobile ? 16 : 18}
                      height={isMobile ? 16 : 18}
                      className="w-full h-full brightness-0 invert"
                    />
                  </div>
                  <h4 className={`${isMobile ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} font-semibold text-gray-900`}>
                    {areaLabel}
                  </h4>
                </div>
                <p className={`${isMobile ? 'text-xs sm:text-sm' : 'text-sm'} text-gray-700 leading-relaxed ${!isPositionExpanded && isTruncated ? 'line-clamp-3' : ''}`}>
                  {position}
                </p>
                {isTruncated && (
                  <button
                    onClick={() => togglePosition(areaKey)}
                    className={`mt-2 ${isMobile ? 'text-xs sm:text-sm' : 'text-sm'} text-blue-600 hover:text-blue-700 font-medium transition-colors cursor-pointer`}
                  >
                    {isPositionExpanded ? 'Ver menos' : 'Ver más'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className={`${isMobile ? 'text-xs sm:text-sm py-4' : 'text-sm py-8'} text-gray-500 text-center`}>
          No hay posiciones disponibles
        </p>
      )}
    </div>
  );
}
