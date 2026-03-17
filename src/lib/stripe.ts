import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-24.clover' as any,
  appInfo: {
    name: 'VIBE Social Platform',
    version: '0.1.0',
  },
});
