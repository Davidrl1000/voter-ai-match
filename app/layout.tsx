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
  title: "Votante AI - Encuentra tu candidato ideal para Costa Rica 2026",
  description: "Descubre qué candidato presidencial se alinea mejor con tus valores políticos para las elecciones de Costa Rica 2026. Responde preguntas sobre política, economía, salud, educación y más. Sistema imparcial powered by AI con análisis en 7 áreas clave.",
  keywords: [
    "votante ai",
    "elecciones costa rica 2026",
    "candidatos presidenciales costa rica",
    "quiz político costa rica",
    "matching político",
    "inteligencia artificial política",
    "comparar candidatos",
    "votación informada",
    "análisis político ai",
    "elecciones presidenciales",
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
    title: 'Votante AI - Encuentra tu candidato ideal para Costa Rica 2026',
    description: 'Descubre qué candidato presidencial se alinea mejor con tus valores políticos para las elecciones de Costa Rica 2026. Sistema imparcial powered by AI con análisis en 7 áreas clave: economía, salud, educación, seguridad, ambiente, derechos sociales y corrupción.',
    siteName: 'Votante AI',
    images: [
      {
        url: '/assets/icons/ai-sparkle.svg',
        width: 1200,
        height: 630,
        alt: 'Votante AI - Sistema de matching político para Costa Rica 2026',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Votante AI - Encuentra tu candidato ideal para Costa Rica 2026',
    description: 'Sistema imparcial powered by AI. Responde preguntas y descubre qué candidato presidencial se alinea mejor con tus valores políticos.',
    images: ['/assets/icons/ai-sparkle.svg'],
    creator: '@votanteai',
    site: '@votanteai',
  },
  icons: {
    icon: '/assets/icons/ai-sparkle.svg',
    shortcut: '/assets/icons/ai-sparkle.svg',
    apple: '/assets/icons/ai-sparkle.svg',
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
                'Sistema de matching político imparcial powered by AI para las elecciones presidenciales de Costa Rica 2026. Ayuda a los votantes a descubrir qué candidato se alinea mejor con sus valores.',
              url: 'https://votante-ai.com',
              inLanguage: 'es-CR',
              creator: {
                '@type': 'Organization',
                name: 'Votante AI',
                url: 'https://votante-ai.com',
              },
              featureList: [
                'Análisis político imparcial',
                'Matching basado en inteligencia artificial',
                'Comparación de candidatos en 7 áreas clave',
                'Resultados personalizados',
                'Privacidad garantizada',
              ],
              keywords:
                'elecciones costa rica 2026, candidatos presidenciales, quiz político, matching político, inteligencia artificial',
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
              logo: 'https://votante-ai.com/assets/icons/ai-sparkle.svg',
              description:
                'Plataforma de información política imparcial para las elecciones de Costa Rica 2026.',
              sameAs: [
                'https://github.com/Davidrl1000/voter-ai-match',
              ],
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
