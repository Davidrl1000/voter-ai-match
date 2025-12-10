'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { trackGTMEvent, GTMEvents } from '@/lib/gtm';
import Flag from './Flag';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  return (
    <>
      {/* Costa Rica Flag */}
      <Flag />

      {/* Header Bar */}
      <header className="fixed top-12 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between relative">
          {/* Logo/Title */}
          <button
            onClick={() => {
              trackGTMEvent(GTMEvents.CANDIDATES_BACK_HOME, {
                source: 'header_logo',
              });
              // Always force reload to reset state
              window.location.href = '/';
            }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Votante
            </span>
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI
            </span>
          </button>

          {/* Hamburger Button */}
          <button
            ref={buttonRef}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer relative"
            aria-label="Toggle menu"
          >
            <Image
              src={isMenuOpen ? '/assets/icons/close.svg' : '/assets/icons/hamburger-menu.svg'}
              alt=""
              width={24}
              height={24}
              className="text-gray-700"
            />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div
              ref={menuRef}
              className="absolute top-full right-0 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-[60] overflow-hidden"
            >
          <nav className="py-2">
            <button
              onClick={() => {
                setIsMenuOpen(false);
                trackGTMEvent(GTMEvents.CANDIDATES_BACK_HOME, {
                  source: 'header_menu',
                });
                // Always force reload to reset state
                window.location.href = '/';
              }}
              className="block w-full text-left px-4 py-3 text-sm text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-colors font-medium cursor-pointer"
            >
              Inicio
            </button>
            <Link
              href="/candidates"
              onClick={() => {
                setIsMenuOpen(false);
                trackGTMEvent(GTMEvents.HOME_VIEW_CANDIDATES, {
                  source: 'header_menu',
                });
              }}
              className="block px-4 py-3 text-sm text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-colors font-medium"
            >
              Candidatos
            </Link>
            <Link
              href="/notes"
              onClick={() => {
                setIsMenuOpen(false);
                trackGTMEvent(GTMEvents.NOTES_BACK_HOME, {
                  source: 'header_menu',
                });
              }}
              className="block px-4 py-3 text-sm text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-colors font-medium"
            >
              Información
            </Link>
          </nav>
        </div>
          )}
        </div>
      </header>

      {/* Spacer to prevent content from being hidden under fixed header */}
      <div className="h-28" />
    </>
  );
}
