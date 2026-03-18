import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { PLAN_LIMITS } from '@/lib/plans';

/**
 * API per creare una sessione di checkout Stripe.
 * Supporta i piani: Starter, Pro, Enterprise (valuta CHF).
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { planId, entityId, entityType } = await req.json();

    if (!planId || !entityId) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
    }

    // Definizione dei prezzi dinamica da PLAN_LIMITS
    const plans: Record<string, { amount: number; name: string }> = {
      basic: { amount: PLAN_LIMITS.basic.price_chf * 100, name: 'VIBE Basic' },
      pro: { amount: PLAN_LIMITS.pro.price_chf * 100, name: 'VIBE Pro' },
      enterprise: { amount: PLAN_LIMITS.premium.price_chf * 100, name: 'VIBE Enterprise' },
    };

    const selectedPlan = plans[planId.toLowerCase()];
    if (!selectedPlan) {
      return NextResponse.json({ error: 'Piano non valido' }, { status: 400 });
    }

    // Crea sessione di checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'twint'], // Supporto TWINT per la Svizzera
      line_items: [
        {
          price_data: {
            currency: 'chf',
            product_data: {
              name: selectedPlan.name,
              description: `Abbonamento per ${entityType} ${entityId}`,
            },
            unit_amount: selectedPlan.amount,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        entityId,
        entityType,
        plan: planId.toLowerCase(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Errore checkout Stripe:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
