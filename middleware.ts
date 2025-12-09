import { NextRequest, NextResponse } from 'next/server';

// Allowed origins for API access
const allowedOrigins = [process.env.WEBSITE_URL];

// CORS configuration for API routes
const corsOptions = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // 24 hours
};

/**
 * Extract origin from referer URL
 */
function getOriginFromReferer(referer: string): string {
  try {
    const url = new URL(referer);
    return url.origin;
  } catch {
    return '';
  }
}

/**
 * Handle API requests with CORS and origin validation
 */
function handleApiRequest(request: NextRequest): NextResponse {
  // Get origin from request headers
  const origin =
    request.headers.get('Origin') ||
    getOriginFromReferer(request.headers.get('Referer') ?? '') ||
    '';

  // Check if origin is allowed (exact match for security)
  const isAllowedOrigin =
    allowedOrigins.includes(origin) ||
    (origin.includes('localhost') && allowedOrigins.some((allowed) => allowed?.includes('localhost')));

  // Handle preflight requests (OPTIONS)
  if (request.method === 'OPTIONS') {
    if (!isAllowedOrigin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const preflightHeaders = {
      'Access-Control-Allow-Origin': origin,
      ...corsOptions,
    };

    return NextResponse.json({}, { headers: preflightHeaders });
  }

  // Block requests from disallowed origins
  if (!isAllowedOrigin) {
    console.warn(`Blocked API request from unauthorized origin: ${origin}`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Allow the request and add CORS headers
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', origin);
  Object.entries(corsOptions).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Add security headers to all responses
 */
function addSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  // X-XSS-Protection is deprecated but kept for legacy browser support
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Content Security Policy for XSS protection
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://scripts.clarity.ms",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://*.clarity.ms",
    "frame-src 'self' https://www.googletagmanager.com",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all API routes
  if (pathname.startsWith('/api/')) {
    const response = handleApiRequest(request);
    addSecurityHeaders(response);
    return response;
  }

  // Add security headers to all other responses
  const response = NextResponse.next();
  addSecurityHeaders(response);
  return response;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|assets/).*)',
  ],
};
