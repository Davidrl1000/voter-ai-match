import Image from 'next/image';

export default function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 animate-pulse">
          <Image
            src="/assets/icons/ai-sparkle.svg"
            alt=""
            width={48}
            height={48}
            className="w-full h-full opacity-60"
          />
        </div>
        <p className="text-gray-600 text-sm font-medium">
          {message || 'Cargando...'}
        </p>
      </div>
    </div>
  );
}
