import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './lib/i18n/config';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize the ratelimiter
let ratelimit: Ratelimit | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(50, '10 s'),
      analytics: true,
      prefix: '@upstash/ratelimit',
    });
  }
} catch (e) {
  console.warn("Ratelimiter non configurato");
}

/**
 * Proxy — protegge le route (app), gestisce i locale e il refresh dei token di sessione.
 * In Next.js 16+, 'proxy.ts' sostituisce 'middleware.ts'.
 */
export async function proxy(request: NextRequest) {
  // 0. Extract pathname for routing and rate limiting
  const { pathname } = request.nextUrl;

  // 1. Rate Limiting for API routes
  if (pathname.startsWith('/api') && ratelimit) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const { success, reset } = await ratelimit.limit(ip);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests - Fort Knox Activated.' },
        { status: 429, headers: { 'Retry-After': reset.toString() } }
      );
    }
  }

  // 2. Check if it's an auth callback to skip i18n
  const isAuthCallback = pathname.startsWith('/auth/callback');

  let response: NextResponse;

  if (isAuthCallback) {
    response = NextResponse.next();
  } else {
    // 2. Inizializza il middleware di next-intl
    const handleI18nRouting = createIntlMiddleware({
      locales,
      defaultLocale,
      localeDetection: true
    });
    response = handleI18nRouting(request);
  }

  // 3. Inizializza Supabase Client integrato con la risposta i18n
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          // Aggiorna la risposta esistente per includere i nuovi cookie di Supabase
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 4. Verifica autenticazione (getUser è più sicuro di getSession)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rimuovi il prefisso locale dal pathname per il check delle route (preserva lo slash iniziale)
  const pathnameWithoutLocale = pathname.replace(/^\/(it|en|de|fr|rm)/, '') || '/';
  
  // Route pubbliche che NON richiedono autenticazione
  const normalizedPath = pathnameWithoutLocale.startsWith('/') ? pathnameWithoutLocale : `/${pathnameWithoutLocale}`;

  const isPublicRoute =
    normalizedPath === '/' ||
    normalizedPath.startsWith('/login') ||
    normalizedPath.startsWith('/register') ||
    normalizedPath.startsWith('/privacy') ||
    normalizedPath.startsWith('/termini') ||
    normalizedPath.startsWith('/auth/callback');

  // Se l'utente non è autenticato e tenta di accedere a route protette
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login'; // Il middleware i18n aggiungerà il locale automaticamente
    return NextResponse.redirect(url);
  }

  // Se l'utente è autenticato e tenta di accedere a login/register
  if (user && (pathnameWithoutLocale.startsWith('/login') || pathnameWithoutLocale.startsWith('/register'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/map';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Applica a tutte le route tranne asset e API interne
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ],
};
