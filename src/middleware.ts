import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './lib/i18n/config';

/**
 * Middleware — protegge le route (app), gestisce i locale e il refresh dei token di sessione.
 */
export async function middleware(request: NextRequest) {
  // 1. Inizializza il middleware di next-intl
  const handleI18nRouting = createIntlMiddleware({
    locales,
    defaultLocale,
    localeDetection: true
  });

  // 2. Ottieni la risposta dal middleware i18n
  let response = handleI18nRouting(request);

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

  const { pathname } = request.nextUrl;

  // Rimuovi il prefisso locale dal pathname per il check delle route (preserva lo slash iniziale)
  const pathnameWithoutLocale = pathname.replace(/^\/(it|en|de|fr|rm)/, '') || '/';
  
  // Route pubbliche che NON richiedono autenticazione
  // Usiamo startsWith con slash per sicurezza
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
