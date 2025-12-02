import Image from 'next/image';
import { getPhotoPath, getLogoPath } from '@/lib/candidate-assets';

interface CandidateCardProps {
  name: string;
  party: string;
  plan: string;
  site: string;
}

export default function CandidateCard({ name, party, plan, site }: CandidateCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-all hover:scale-[1.02]">
      <div className="flex flex-col items-center text-center">
        {/* Photo with Party Logo Badge */}
        <div className="relative mb-4">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100">
            <Image
              src={getPhotoPath(party)}
              alt={name}
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
              src={getLogoPath(party)}
              alt={party}
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
          {name}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {party}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-full">
          <a
            href={`/assets/docs/${plan}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-center"
          >
            Ver Plan de Gobierno
          </a>
          <a
            href={site}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            Información Oficial
          </a>
        </div>
      </div>
    </div>
  );
}
