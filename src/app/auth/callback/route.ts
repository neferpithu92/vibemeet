import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Callback OAuth — gestisce il redirect dopo Google/Apple/Facebook login.
 * Scambia il code per una sessione e reindirizza a /map.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/map';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect a login con errore
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
