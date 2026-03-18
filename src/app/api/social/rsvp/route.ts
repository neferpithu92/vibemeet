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
    // Controlla se esiste già
    const existing = await supabase.from('event_rsvps')
      .select('id').eq('event_id', eventId).eq('user_id', user.id).single();
    
    if (!existing.data) {
      const { error } = await supabase
        .from('event_rsvps')
        .insert({ event_id: eventId, user_id: user.id, status: 'going' });
        
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'RSVP registrato' });
    }
  } else if (action === 'unrsvp') {
    // Rimuovi RSVP
    const existing = await supabase.from('event_rsvps')
      .select('id').eq('event_id', eventId).eq('user_id', user.id).single();
    
    if (existing.data) {
      const { error } = await supabase
        .from('event_rsvps')
        .delete()
        .eq('id', existing.data.id);
        
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'RSVP rimosso' });
    }
  }

  return NextResponse.json({ error: 'Azione non valida' }, { status: 400 });
}
