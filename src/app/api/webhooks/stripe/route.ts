import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Webhook handler per Stripe.
 * Gestisce l'attivazione e l'annullamento degli abbonamenti.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const session = event.data.object as any;

  // 1. Checkout Completato -> Attiva Abbonamento
  if (event.type === 'checkout.session.completed') {
    const subscription = (await stripe.subscriptions.retrieve(session.subscription)) as any;
    const { userId, entityId, entityType, plan } = session.metadata;

    // Aggiorna o Inserisce l'abbonamento nel DB
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
  }

  // 2. Abbonamento Aggiornato/Rinnovato
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as any;
    
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

    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'canceled' })
      .eq('stripe_subscription_id', subscription.id);
  }

  return NextResponse.json({ received: true });
}
