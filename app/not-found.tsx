'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Error Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center">
          {/* AI Sparkle Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-gray-100 to-blue-100 rounded-full mb-6">
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
          <div className="text-8xl font-bold bg-gradient-to-r from-gray-600 to-blue-600 bg-clip-text text-transparent mb-4 tabular-nums">
            404
          </div>

          {/* Error Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Página no encontrada
          </h1>

          {/* Error Description */}
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Lo sentimos, la página que buscas no existe o ha sido movida.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center"
            >
              Volver al inicio
            </Link>
            <Link
              href="/notes"
              className="px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center"
            >
              Ver notas
            </Link>
          </div>

          {/* Helpful Links */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3">
              Enlaces útiles:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link
                href="/"
                className="text-sm text-blue-600 hover:text-blue-700 underline underline-offset-2"
              >
                Inicio
              </Link>
              <span className="text-gray-300">•</span>
              <Link
                href="/candidates"
                className="text-sm text-blue-600 hover:text-blue-700 underline underline-offset-2"
              >
                Candidatos
              </Link>
              <span className="text-gray-300">•</span>
              <Link
                href="/notes"
                className="text-sm text-blue-600 hover:text-blue-700 underline underline-offset-2"
              >
                Notas
              </Link>
            </div>
          </div>
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
