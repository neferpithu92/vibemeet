import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route per gestire i Check-in (locali ed eventi).
 */
export async function POST(request: Request) {
  const { venueId, eventId, location } = await request.json();
  const supabase = await createClient();

  // Recupera l'utente corrente
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  // Registra il check-in
  const { error } = await (supabase
    .from('check_ins') as any)
    .insert({
      user_id: user.id,
      venue_id: venueId || null,
      event_id: eventId || null,
      location: location ? `POINT(${location.lng} ${location.lat})` : null
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notifiche o Analytics potrebbero essere gestiti qui o via trigger DB
  
  return NextResponse.json({ success: true, message: 'Check-in completato' });
}
