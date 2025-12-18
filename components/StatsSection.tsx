import Image from 'next/image';

interface PdfStats {
  pageCount: number;
  wordCount: number;
  readingTimeMinutes: number;
  mostUsedWord: string;
}

interface StatsSectionProps {
  planStats: PdfStats;
  variant?: 'mobile' | 'desktop';
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

export default function StatsSection({ planStats, variant = 'mobile' }: StatsSectionProps) {
  const isMobile = variant === 'mobile';

  return (
    <div>
      <h3 className={`${isMobile ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} font-semibold text-gray-900 ${isMobile ? 'mb-3' : 'mb-4'} flex items-center gap-2`}>
        <Image
          src="/assets/icons/chart-bar.svg"
          alt=""
          width={isMobile ? 20 : 24}
          height={isMobile ? 20 : 24}
          className={isMobile ? 'w-5 h-5' : 'w-6 h-6'}
        />
        <span>Estadísticas del Plan</span>
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-xs text-gray-600 mb-1">Tiempo de lectura</p>
          <p className={`${isMobile ? 'text-base sm:text-lg' : 'text-lg'} font-bold text-gray-900`}>
            {formatReadingTime(planStats.readingTimeMinutes)}
          </p>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-600 mb-1">Páginas</p>
          <p className={`${isMobile ? 'text-base sm:text-lg' : 'text-lg'} font-bold text-gray-900`}>
            {planStats.pageCount}
          </p>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-600 mb-1">Término más usado</p>
          <p className={`${isMobile ? 'text-sm sm:text-base' : 'text-base'} font-bold text-gray-900 capitalize truncate`}>
            {planStats.mostUsedWord}
          </p>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-600 mb-1">Palabras</p>
          <p className={`${isMobile ? 'text-sm sm:text-base' : 'text-base'} font-bold text-gray-900`}>
            {planStats.wordCount.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
