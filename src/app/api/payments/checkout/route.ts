import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Mock API per la creazione di una sessione di pagamento (Stripe Concept).
 * In produzione qui si integrerebbe stripe.checkout.sessions.create()
 */
export async function POST(request: Request) {
  const { eventId } = await request.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  // Recupera dettagli evento (prezzo)
  const { data: event } = await supabase
    .from('events')
    .select('id, title, ticket_price, organizer_id')
    .eq('id', eventId)
    .single();

  if (!event || !event.ticket_price || event.ticket_price <= 0) {
    return NextResponse.json({ error: 'Evento gratuito o non trovato' }, { status: 400 });
  }

  // In un'app reale creeremmo un record 'payments' con status 'pending'
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      entity_id: event.id,
      entity_type: 'event',
      amount: event.ticket_price,
      status: 'pending',
      currency: 'CHF',
      metadata: { event_title: event.title }
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Ritorna un mock client secret o URL di redirect
  return NextResponse.json({ 
    sessionId: payment.id,
    checkoutUrl: `/it/events/${eventId}/checkout?paymentId=${payment.id}`,
    amount: event.ticket_price,
    currency: 'CHF'
  });
}
