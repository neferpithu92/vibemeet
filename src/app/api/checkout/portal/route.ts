import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Route API per accedere al Customer Portal di Stripe.
 * Richiede entityId (Manda il portale basato sulla property dell'abbonamento per Stripe)
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { entityId } = await req.json();

    if (!entityId) {
      return NextResponse.json({ error: 'Entity ID mancante' }, { status: 400 });
    }

    // Cerchiamo nella tabella subscriptions usando l'admin db se necessario o via policy utente 
    // l'abbonamento legato all'entityId che combini l'apposita customer id su stripe
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('entity_id', entityId)
      .eq('status', 'active')
      .single();

    if (error || !subscription || !subscription.stripe_customer_id) {
      return NextResponse.json({ error: 'Nessun abbonamento attivo trovato per questa venue' }, { status: 404 });
    }

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });

  } catch (err: any) {
    console.error('Errore creazione customer portal:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
