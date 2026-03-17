import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route per gestire gli RSVP agli eventi (tramite la tabella likes).
 */
export async function POST(request: Request) {
  const { eventId, action } = await request.json();
  const supabase = await createClient();

  // Recupera l'utente corrente
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  if (action === 'rsvp') {
    // Aggiungi un like/rsvp
    const { error } = await supabase
      .from('likes')
      .upsert({
        user_id: user.id,
        entity_type: 'event',
        entity_id: eventId,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Incrementa rsvp_count nell'evento (opzionale, se gestito via trigger nel DB è meglio)
    // Qui lo facciamo manualmente se non c'è trigger
    await supabase.rpc('increment_rsvp', { row_id: eventId });

    return NextResponse.json({ success: true, message: 'RSVP registrato' });
  } else if (action === 'unrsvp') {
    // Rimuovi il like/rsvp
    const { error } = await supabase
      .from('likes')
      .delete()
      .match({
        user_id: user.id,
        entity_type: 'event',
        entity_id: eventId,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Decrementa rsvp_count
    await supabase.rpc('decrement_rsvp', { row_id: eventId });

    return NextResponse.json({ success: true, message: 'RSVP rimosso' });
  }

  return NextResponse.json({ error: 'Azione non valida' }, { status: 400 });
}
