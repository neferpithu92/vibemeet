import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API per aggiornare la posizione in tempo reale dell'utente (Heartbeat).
 * Riceve lat e lon dal client e aggiorna la tabella users.
 */
export async function POST(req: Request) {
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
    const { error } = await supabase
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
