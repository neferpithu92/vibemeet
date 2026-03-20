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

  // Usa l'origin corrente per i redirect dinamici (Vercel Preview/Dev)
  // A meno che non siamo su produzione e vogliamo forzare la URL principale.
  const baseUrl = origin; 

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
    
    // Se c'è un errore nello scambio del codice, loggalo e riportatelo nella URL
    console.error('Auth Callback Error:', error.message);
    return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_error&message=${encodeURIComponent(error.message)}`);
  }

  // Redirect a login se manca il codice
  return NextResponse.redirect(`${baseUrl}/login?error=no_code`);
}
