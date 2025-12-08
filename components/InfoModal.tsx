'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function InfoModal({ isOpen, onClose, title, children }: InfoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    // Save previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus modal when it opens
    const timer = setTimeout(() => {
      modalRef.current?.focus();
    }, 100);

    // Handle keyboard events
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Focus trap
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
      document.body.style.overflow = 'unset';

      // Restore focus to previous element
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        role="document"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <h2 id="modal-title" className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
            aria-label="Cerrar ventana emergente"
          >
            <div className="w-5 h-5">
              <Image
                src="/assets/icons/close.svg"
                alt=""
                height={20}
                width={20}
                className="w-full h-full brightness-0 invert cursor-pointer"
              />
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(80vh-12rem)]">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer"
            aria-label="Cerrar ventana emergente y volver al contenido anterior"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
