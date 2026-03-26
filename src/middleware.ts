import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './lib/i18n/config';
import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

// Cache the ratelimiter outside the request handler
let ratelimit: Ratelimit | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(50, '10 s'), // 50 requests per 10 seconds max per IP
      analytics: true,
      prefix: '@upstash/ratelimit',
    });
  }
} catch (e) {
  console.warn("Ratelimiter non configurato (mancano chiavi Upstash)");
}

export default async function middleware(request: NextRequest) {
  // 1. Applica il Rate Limiting se siamo su rotta API e il ratelimiter esiste
  if (request.nextUrl.pathname.startsWith('/api') && ratelimit) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const { success, reset } = await ratelimit.limit(ip);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests - Rate limit exceeded. Fort Knox Activated.' },
        { status: 429, headers: { 'Retry-After': reset.toString() } }
      );
    }
  }

  // 2. Se è un'API passa oltre (next-intl serve solo front-end)
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 3. Esegui il middleware di traduzione front-end standard
  return intlMiddleware(request);
}

export const config = {
  // Matcher cattura la root, gli idiomi, e per sicurezza la folder /api
  matcher: [
    '/',
    '/(it|en|de|fr|rm)/:path*',
    '/api/:path*'
  ]
};
