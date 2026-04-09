import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Webhook handler per Stripe.
 * Gestisce l'attivazione e l'annullamento degli abbonamenti.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Config error' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const session = event.data.object as any;

  // 1. Checkout Completato -> Attiva Abbonamento/Registra Biglietto
  if (event.type === 'checkout.session.completed') {
    const { userId, entityId, entityType, plan } = session.metadata;
    const supabaseAdmin = getSupabaseAdmin() as any;

    if (session.mode === 'subscription') {
      const subscription = (await stripe.subscriptions.retrieve(session.subscription)) as any;
      
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          entity_id: entityId,
          entity_type: entityType,
          plan: plan,
          status: 'active',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, { onConflict: 'stripe_subscription_id' });

      if (error) {
        console.error('Errore salvataggio abbonamento:', error);
      }
    } else if (session.mode === 'payment') {
      // Registra il biglietto / acquisto singolo
      const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
      
      const { error } = await supabaseAdmin
        .from('payments')
        .insert({
          user_id: userId,
          entity_id: entityId,
          entity_type: entityType, // 'event_ticket'
          amount: amountTotal,
          status: 'succeeded',
          currency: session.currency?.toUpperCase() || 'CHF',
          metadata: session.metadata
        });

      if (error) {
         console.error('Errore registrazione pagamento singolo:', error);
      }
    }
  }

  // 2. Abbonamento Aggiornato/Rinnovato
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as any;
    const supabaseAdmin = getSupabaseAdmin() as any;
    
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  // 3. Abbonamento Cancellato
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any;
    const supabaseAdmin = getSupabaseAdmin() as any;

    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'canceled' })
      .eq('stripe_subscription_id', subscription.id);
  }

  return NextResponse.json({ received: true });
}
