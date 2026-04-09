import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API per la creazione di una sessione di pagamento Stripe (Biglietti per Eventi).
 */
export async function POST(request: Request) {
  const { eventId } = await request.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  // Recupera dettagli evento (prezzo e creatore)
  const { data: event } = await supabase
    .from('events')
    .select('id, title, ticket_price, organizer_id')
    .eq('id', eventId)
    .single();

  if (!event || !event.ticket_price || event.ticket_price <= 0) {
    return NextResponse.json({ error: 'Evento gratuito o non trovato' }, { status: 400 });
  }
  
  try {
    // Genera sessione di Checkout in modalità "payment" per l'acquisto occasionale
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'twint'], // Twint solitamente disponibile su Stripe in CHF per checkout one-off
      line_items: [
        {
          price_data: {
            currency: 'chf',
            product_data: {
              name: `Ticket: ${event.title}`,
              description: `Accesso all'evento supportato dal creatore.`,
            },
            unit_amount: Math.round(event.ticket_price * 100),
            // tax_behavior per l'IVA è omesso in assenza di configurazione IVA per ticket specifici, ma possiamo forzarlo
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // Diversamente dalla subscription!
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=canceled`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        entityId: event.id,
        entityType: 'event_ticket',
        organizerId: event.organizer_id,
      },
    });

    return NextResponse.json({ 
      sessionId: session.id,
      checkoutUrl: session.url,
      amount: event.ticket_price,
      currency: 'CHF'
    });
  } catch (err: any) {
    console.error('Errore checkout Stripe per Entity:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
