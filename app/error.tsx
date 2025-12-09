'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string; status?: number };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Error boundary caught:', error);
  }, [error]);

  // Determine error code
  const errorCode = error.status || 500;
  const isServerError = errorCode >= 500;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Error Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center">
          {/* AI Sparkle Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-100 to-orange-100 rounded-full mb-6">
            <div className="w-8 h-8">
              <Image
                src="/assets/icons/ai-sparkle.svg"
                alt=""
                width={32}
                height={32}
                className="w-full h-full opacity-50"
              />
            </div>
          </div>

          {/* Error Code */}
          <div className="text-8xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-4 tabular-nums">
            {errorCode}
          </div>

          {/* Error Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {isServerError ? 'Error del Servidor' : 'Algo salió mal'}
          </h1>

          {/* Error Description */}
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            {isServerError
              ? 'Ocurrió un error en nuestro servidor. Por favor, intenta de nuevo en unos momentos.'
              : 'Lo sentimos, ocurrió un error inesperado. Por favor, intenta de nuevo.'}
          </p>

          {/* Error Details (Development) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-8 text-left">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 mb-2">
                Detalles del error (desarrollo)
              </summary>
              <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono text-gray-800 overflow-auto max-h-48">
                <div className="mb-2">
                  <strong>Mensaje:</strong> {error.message}
                </div>
                {error.digest && (
                  <div className="mb-2">
                    <strong>Digest:</strong> {error.digest}
                  </div>
                )}
                {error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Intentar de nuevo
            </button>
            <Link
              href="/"
              className="px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center"
            >
              Volver al inicio
            </Link>
          </div>

          {/* Footer Note */}
          <p className="mt-8 text-sm text-gray-400">
            Si el problema persiste, por favor contáctanos.
          </p>
        </div>

        {/* Branding */}
        <div className="text-center mt-6">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold">
              <span className="text-gray-800">Votante</span>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {' '}AI
              </span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
