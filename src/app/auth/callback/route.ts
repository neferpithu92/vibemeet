import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Callback OAuth — gestisce il redirect dopo Google/Apple/Facebook login.
 * Scambia il code per una sessione e reindirizza a /map.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/map';
  const origin = requestUrl.origin;

  // Attempt to recover current locale from cookie to avoid extra redirects
  const cookieStore = request.headers.get('cookie');
  const localeMatch = cookieStore?.match(/NEXT_LOCALE=([^;]+)/);
  const locale = localeMatch ? localeMatch[1] : 'it'; // Default locale

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Ensure the redirect path starts with the locale if it's missing
      const redirectPath = next.startsWith(`/${locale}`) ? next : `/${locale}${next}`;
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
    
    console.error('Auth Callback Error:', error.message);
    return NextResponse.redirect(`${origin}/${locale}/login?error=auth_callback_error&message=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=no_code`);
}
