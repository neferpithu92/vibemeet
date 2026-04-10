import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { locales, defaultLocale } from './src/lib/i18n/config';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Auth callback: skip i18n
  if (pathname.startsWith('/auth/callback')) {
    return NextResponse.next();
  }

  // Public paths (without locale prefix)
  const isPublicPath =
    /^\/(it|en|de|fr|rm|es|pt)?\/?$/.test(pathname) ||
    pathname.includes('/login') ||
    pathname.includes('/register') ||
    pathname.includes('/privacy') ||
    pathname.includes('/termini');

  // Run i18n middleware first
  const response = intlMiddleware(request);

  // Check auth for protected routes
  if (!isPublicPath) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Middleware Failure: Missing Supabase environment variables');
      return response ?? NextResponse.next({ request });
    }

    let supabaseResponse = response ?? NextResponse.next({ request });

    try {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() { return request.cookies.getAll(); },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              );
            },
          },
        }
      );

      // Run getUser with a timeout or handled error
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

      // Recover locale for redirects - more robust match
      const localeMatch = pathname.match(/^\/(it|en|de|fr|rm|es|pt)(\/|$)/);
      const currentLocale = localeMatch ? localeMatch[1] : defaultLocale;

      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = `/${currentLocale}/login`;
        return NextResponse.redirect(url);
      }

      // Check account status (paused or deletion) - Resilient check
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('is_paused, deletion_requested_at')
          .eq('id', user.id)
          .single();

        if (userData) {
          const isReactivatePage = pathname.includes('/reactivate');
          
          if ((userData.is_paused || userData.deletion_requested_at) && !isReactivatePage) {
            const url = request.nextUrl.clone();
            url.pathname = `/${currentLocale}/reactivate`;
            return NextResponse.redirect(url);
          }
          
          if (!userData.is_paused && !userData.deletion_requested_at && isReactivatePage) {
            const url = request.nextUrl.clone();
            url.pathname = `/${currentLocale}/map`;
            return NextResponse.redirect(url);
          }
        }
      } catch (err) {
        console.warn('Middleware: account status check failed (columns might be missing)', err);
      }

      return supabaseResponse;
    } catch (err) {
      console.error('Middleware Critical Error:', err);
      return response ?? NextResponse.next({ request });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ],
};
