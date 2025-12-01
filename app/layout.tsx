import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Flag from "@/components/Flag";
import GitHubLink from "@/components/GitHubLink";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Votante AI - Encuentra tu candidato ideal para Costa Rica 2026",
  description: "Descubre qué candidato presidencial se alinea mejor con tus valores políticos para las elecciones de Costa Rica 2026. Powered by AI.",
  keywords: ["votante ai", "elecciones costa rica 2026", "candidatos presidenciales", "inteligencia artificial", "matching politico", "quiz politico"],
  authors: [{ name: "Votante AI" }],
  creator: "Votante AI",
  publisher: "Votante AI",
  metadataBase: new URL('https://votante-ai.com'),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_CR',
    url: 'https://votant-eai.com',
    title: 'Votante AI - Encuentra tu candidato ideal para Costa Rica 2026',
    description: 'Descubre qué candidato presidencial se alinea mejor con tus valores políticos. Powered by AI.',
    siteName: 'Votante AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Votante AI - Encuentra tu candidato ideal',
    description: 'Descubre qué candidato presidencial se alinea mejor con tus valores políticos para Costa Rica 2026.',
  },
  icons: {
    icon: '/assets/icons/ai-sparkle.svg',
    shortcut: '/assets/icons/ai-sparkle.svg',
    apple: '/assets/icons/ai-sparkle.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Flag />
        <GitHubLink />
        {children}
      </body>
    </html>
  );
}
