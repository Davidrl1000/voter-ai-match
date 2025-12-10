import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Candidatos Presidenciales Costa Rica 2026 | Votante AI',
  description:
    'Conoce a todos los candidatos presidenciales para las elecciones de Costa Rica 2026. Información detallada de cada candidato, sus propuestas y planes de gobierno.',
  keywords: [
    'candidatos costa rica 2026',
    'candidatos presidenciales',
    'elecciones costa rica',
    'información candidatos',
    'propuestas candidatos',
  ],
  alternates: {
    canonical: '/candidates',
  },
  openGraph: {
    title: 'Candidatos Presidenciales Costa Rica 2026 | Votante AI',
    description:
      'Conoce a todos los candidatos presidenciales para las elecciones de Costa Rica 2026. Información detallada de cada candidato.',
    url: 'https://votante-ai.com/candidates',
    type: 'website',
    locale: 'es_CR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Candidatos Presidenciales Costa Rica 2026 | Votante AI',
    description:
      'Conoce a todos los candidatos presidenciales para las elecciones de Costa Rica 2026.',
  },
};

export default function CandidatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
