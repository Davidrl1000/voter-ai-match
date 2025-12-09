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
