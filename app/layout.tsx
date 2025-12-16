import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Flag from "@/components/Flag";
import GitHubLink from "@/components/GitHubLink";
import { AggregatedStatsWidget } from "@/components/aggregated-stats-widget";

// Analytics IDs from environment variables
// Only load analytics in production to avoid CORS errors in development
const isProduction = process.env.NODE_ENV === 'production';
const GA_MEASUREMENT_ID = isProduction ? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID : null;
const GTM_ID = isProduction ? process.env.NEXT_PUBLIC_GTM_ID : null;
const CLARITY_ID = isProduction ? process.env.NEXT_PUBLIC_CLARITY_ID : null;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Votante AI - Votaciones Costa Rica 2026 | Encuentra tu candidato ideal",
  description: "Descubre qué candidato presidencial se alinea mejor con tus valores para las votaciones Costa Rica 2026. Quiz político imparcial powered by AI. Compara candidatos en economía, salud, educación, seguridad y más. Vota informado.",
  keywords: [
    "votaciones costa rica 2026",
    "elecciones costa rica 2026",
    "candidatos presidenciales costa rica 2026",
    "votante ai",
    "quiz político costa rica",
    "test político costa rica",
    "matching político",
    "comparar candidatos costa rica",
    "elecciones presidenciales costa rica",
    "voto informado costa rica",
    "candidatos presidencia 2026",
    "propuestas candidatos costa rica",
    "inteligencia artificial política",
    "análisis político ai",
    "a quién votar costa rica",
    "guía electoral costa rica",
  ],
  authors: [{ name: "Votante AI" }],
  creator: "Votante AI",
  publisher: "Votante AI",
  metadataBase: new URL('https://votante-ai.com'),
  alternates: {
    canonical: '/',
  },
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
    url: 'https://votante-ai.com',
    title: 'Votante AI - Votaciones Costa Rica 2026 | Quiz Político',
    description: 'Quiz político imparcial para las votaciones Costa Rica 2026. Descubre qué candidato presidencial se alinea mejor con tus valores. Sistema powered by AI con análisis en 7 áreas: economía, salud, educación, seguridad, ambiente, derechos sociales y anticorrupción. Vota informado.',
    siteName: 'Votante AI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Votante AI - Quiz político para votaciones Costa Rica 2026',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Votante AI - Votaciones Costa Rica 2026',
    description: 'Quiz político imparcial powered by AI. Compara candidatos y descubre quién se alinea mejor con tus valores para las votaciones Costa Rica 2026.',
    images: ['/og-image.png'],
    creator: '@votanteai',
    site: '@votanteai',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
  category: 'Politics',
  applicationName: 'Votante AI',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Votante AI',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        {/* Build version info - visible in page source */}
        <meta name="build-version" content={process.env.NEXT_PUBLIC_GIT_SHA || 'unknown'} />
        <meta name="build-time" content={process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown'} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Build: {process.env.NEXT_PUBLIC_GIT_SHA} @ {process.env.NEXT_PUBLIC_BUILD_TIME} */}

        {/* Google Tag Manager */}
        {GTM_ID && (
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${GTM_ID}');
              `,
            }}
          />
        )}

        {/* Google Tag Manager (noscript) */}
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            ></iframe>
          </noscript>
        )}

        {/* Google Analytics */}
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}

        {/* Microsoft Clarity */}
        {CLARITY_ID && (
          <Script
            id="clarity-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window,document,"clarity","script","${CLARITY_ID}");
              `,
            }}
          />
        )}

        {/* Structured Data (JSON-LD) for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Votante AI',
              applicationCategory: 'Political Information',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              description:
                'Quiz político imparcial powered by AI para las votaciones y elecciones presidenciales de Costa Rica 2026. Ayuda a los votantes a descubrir qué candidato se alinea mejor con sus valores comparando propuestas en 7 áreas clave.',
              url: 'https://votante-ai.com',
              inLanguage: 'es-CR',
              creator: {
                '@type': 'Organization',
                name: 'Votante AI',
                url: 'https://votante-ai.com',
              },
              featureList: [
                'Quiz político imparcial para votaciones Costa Rica 2026',
                'Matching basado en inteligencia artificial',
                'Comparación de candidatos presidenciales en 7 áreas clave',
                'Análisis de propuestas políticas',
                'Resultados personalizados',
                'Privacidad garantizada - voto anónimo',
              ],
              keywords:
                'votaciones costa rica 2026, elecciones costa rica 2026, candidatos presidenciales, quiz político, test político, matching político, inteligencia artificial, voto informado',
            }),
          }}
        />

        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Votante AI',
              url: 'https://votante-ai.com',
              logo: 'https://votante-ai.com/icon.png',
              description:
                'Plataforma de información política imparcial para las votaciones y elecciones de Costa Rica 2026. Quiz político powered by AI.',
              sameAs: [
                'https://github.com/Davidrl1000/voter-ai-match',
              ],
              keywords: 'votaciones costa rica 2026, elecciones, candidatos presidenciales, quiz político',
            }),
          }}
        />

        {/* Skip to main content for screen readers and keyboard navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg"
        >
          Saltar al contenido principal
        </a>
        <Flag />
        <GitHubLink />
        <main id="main-content" className="focus:outline-none" tabIndex={-1}>
          {children}
        </main>
        <AggregatedStatsWidget />
      </body>
    </html>
  );
}
