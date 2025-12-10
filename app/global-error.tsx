'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Global error boundary caught:', error);
  }, [error]);

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error del Servidor - Votante AI</title>
        <style>{`
          .btn-primary-error {
            padding: 0.75rem 2rem;
            background: linear-gradient(to right, #2563eb, #4f46e5);
            color: white;
            font-weight: 600;
            border-radius: 0.75rem;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 1rem;
          }
          .btn-primary-error:hover {
            background: linear-gradient(to right, #1d4ed8, #4338ca);
            transform: scale(1.02);
          }
          .btn-primary-error:active {
            transform: scale(0.98);
          }
          .btn-secondary-error {
            padding: 0.75rem 2rem;
            background: white;
            border: 2px solid #d1d5db;
            color: #374151;
            font-weight: 600;
            border-radius: 0.75rem;
            text-decoration: none;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
          }
          .btn-secondary-error:hover {
            background: #f9fafb;
            border-color: #9ca3af;
            transform: scale(1.02);
          }
          .btn-secondary-error:active {
            transform: scale(0.98);
          }
        `}</style>
      </head>
      <body>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(to bottom right, #f9fafb, #dbeafe)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{ maxWidth: '48rem', width: '100%' }}>
            {/* Error Card */}
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              padding: '3rem',
              textAlign: 'center',
            }}>
              {/* AI Sparkle Icon */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '4rem',
                height: '4rem',
                background: 'linear-gradient(to right, #fee2e2, #fed7aa)',
                borderRadius: '9999px',
                marginBottom: '1.5rem',
              }}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ opacity: 0.5 }}
                  aria-hidden="true"
                >
                  <path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z" />
                </svg>
              </div>

              {/* Error Code */}
              <div style={{
                fontSize: '6rem',
                fontWeight: 'bold',
                background: 'linear-gradient(to right, #dc2626, #ea580c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '1rem',
                fontVariantNumeric: 'tabular-nums',
              }}>
                500
              </div>

              {/* Error Title */}
              <h1 style={{
                fontSize: '2.25rem',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '1rem',
              }}>
                Error del Servidor
              </h1>

              {/* Error Description */}
              <p style={{
                fontSize: '1.125rem',
                color: '#4b5563',
                marginBottom: '2rem',
                lineHeight: '1.75',
              }}>
                Ocurrió un error crítico en nuestro servidor. Por favor, intenta de nuevo en unos momentos.
              </p>

              {/* Error Details (Development) */}
              {process.env.NODE_ENV === 'development' && (
                <details style={{
                  marginBottom: '2rem',
                  textAlign: 'left',
                }}>
                  <summary style={{
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem',
                  }}>
                    Detalles del error (desarrollo)
                  </summary>
                  <div style={{
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#1f2937',
                    overflow: 'auto',
                    maxHeight: '12rem',
                  }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Mensaje:</strong> {error.message}
                    </div>
                    {error.digest && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Digest:</strong> {error.digest}
                      </div>
                    )}
                    {error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre style={{
                          marginTop: '0.25rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}>
                          {error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                justifyContent: 'center',
              }}>
                <button
                  onClick={reset}
                  className="btn-primary-error"
                >
                  Intentar de nuevo
                </button>
                <Link
                  href="/"
                  className="btn-secondary-error"
                >
                  Volver al inicio
                </Link>
              </div>

              {/* Footer Note */}
              <p style={{
                marginTop: '2rem',
                fontSize: '0.875rem',
                color: '#4b5563',
              }}>
                Si el problema persiste, por favor contáctanos.
              </p>
            </div>

            {/* Branding */}
            <div style={{
              textAlign: 'center',
              marginTop: '1.5rem',
            }}>
              <Link href="/" style={{ textDecoration: 'none' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  <span style={{ color: '#1f2937' }}>Votante</span>
                  <span style={{
                    background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    {' '}AI
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
