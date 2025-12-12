'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { trackGTMEvent, GTMEvents } from '@/lib/gtm';
import Flag from './Flag';

export default function Header() {
  const pathname = usePathname();

  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    trackGTMEvent(GTMEvents.CANDIDATES_BACK_HOME, {
      source: 'header_logo',
    });
    // Always force reload to reset state
    window.location.href = '/';
  }, []);

  const handleHomeClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    trackGTMEvent(GTMEvents.CANDIDATES_BACK_HOME, {
      source: 'header_nav',
    });
    // Always force reload to reset state
    window.location.href = '/';
  }, []);

  const handleCandidatesClick = useCallback(() => {
    trackGTMEvent(GTMEvents.HOME_VIEW_CANDIDATES, {
      source: 'header_nav',
    });
  }, []);

  const handleNotesClick = useCallback(() => {
    trackGTMEvent(GTMEvents.NOTES_BACK_HOME, {
      source: 'header_nav',
    });
  }, []);

  return (
    <>
      {/* Costa Rica Flag */}
      <Flag />

      {/* Header Bar */}
      <header className="fixed top-12 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo/Title */}
          <Link
            href="/"
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Votante
            </span>
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2">
            {pathname !== '/' && (
              <Link
                href="/"
                onClick={handleHomeClick}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-lg transition-all duration-200"
              >
                Inicio
              </Link>
            )}
            {pathname !== '/candidates' && (
              <Link
                href="/candidates"
                onClick={handleCandidatesClick}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-lg transition-all duration-200"
              >
                Candidatos
              </Link>
            )}
            {pathname !== '/notes' && (
              <Link
                href="/notes"
                onClick={handleNotesClick}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-lg transition-all duration-200"
              >
                Información
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Spacer to prevent content from being hidden under fixed header */}
      <div className="h-28" />
    </>
  );
}
