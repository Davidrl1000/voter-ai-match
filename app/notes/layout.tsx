import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acerca de Votante AI | Información y Privacidad',
  description:
    'Conoce más sobre Votante AI, nuestra misión de promover votación informada en Costa Rica 2026, metodología de matching político y políticas de privacidad.',
  keywords: [
    'votante ai información',
    'privacidad votante ai',
    'matching político metodología',
    'votación informada',
    'transparencia electoral',
  ],
  alternates: {
    canonical: '/notes',
  },
  openGraph: {
    title: 'Acerca de Votante AI | Información y Privacidad',
    description:
      'Conoce más sobre Votante AI, nuestra misión de promover votación informada en Costa Rica 2026 y políticas de privacidad.',
    url: 'https://votante-ai.com/notes',
    type: 'website',
    locale: 'es_CR',
  },
  twitter: {
    card: 'summary',
    title: 'Acerca de Votante AI | Información y Privacidad',
    description:
      'Conoce más sobre Votante AI y nuestra misión de promover votación informada en Costa Rica 2026.',
  },
};

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
