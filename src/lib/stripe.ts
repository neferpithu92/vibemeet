import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey && process.env.NODE_ENV === 'production') {
  throw new Error('STRIPE_SECRET_KEY env var is required in production');
}

export const stripe = new Stripe(stripeKey || 'sk_test_placeholder_for_build', {
  apiVersion: '2025-02-24.clover' as any,
  appInfo: {
    name: 'VIBE Social Platform',
    version: '0.1.0',
  },
});
