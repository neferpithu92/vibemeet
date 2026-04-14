import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API per aggiornare la posizione in tempo reale dell'utente (Heartbeat).
 * Riceve lat e lon dal client e aggiorna la tabella users.
 */
const rateLimit = new Map<string, { count: number; lastUpdate: number }>();

export async function POST(req: Request) {
  // Simple Rate Limiting: max 5 requests per minute per IP
  const forwardedFor = req.headers.get('x-forwarded-for') || 'unknown';
  const ip = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0] : 'unknown';
  
  const now = Date.now();
  const userData = rateLimit.get(ip) || { count: 0, lastUpdate: now };
  
  if (now - userData.lastUpdate > 60000) {
    userData.count = 1;
    userData.lastUpdate = now;
  } else {
    userData.count++;
  }
  rateLimit.set(ip, userData);

  if (userData.count > 10) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Coordinate mancanti' }, { status: 400 });
    }

    // Aggiorna last_location (PostGIS) via RPC per massima coerenza
    const { error } = await (supabase as any)
      .rpc('update_user_location', {
        lon: longitude,
        lat: latitude
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Errore update presenza:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
