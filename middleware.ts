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
    /^\/(it|en|de|fr|rm)?\/?$/.test(pathname) ||
    pathname.includes('/login') ||
    pathname.includes('/register') ||
    pathname.includes('/privacy') ||
    pathname.includes('/termini');

  // Run i18n middleware first
  const response = intlMiddleware(request);

  // Check auth for protected routes
  if (!isPublicPath) {
    let supabaseResponse = response ?? NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const url = request.nextUrl.clone();
      // Detect locale from pathname
      const localeMatch = pathname.match(/^\/(it|en|de|fr|rm)\//);
      const currentLocale = localeMatch ? localeMatch[1] : defaultLocale;
      url.pathname = `/${currentLocale}/login`;
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ],
};
