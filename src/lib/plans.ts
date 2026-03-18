/**
 * Plan Limits & Feature Gating
 * Centralizes subscription tier logic for vibemeet.
 */

export type PlanTier = 'starter' | 'basic' | 'pro' | 'premium' | 'artist_free' | 'artist_pro';

export type GatedFeature =
  | 'max_events_per_month'
  | 'analytics_access'
  | 'challenge_creation'
  | 'promoted_posts'
  | 'ticket_sales'
  | 'stories_link'
  | 'custom_branding'
  | 'priority_support'
  | 'max_media_per_event'
  | 'ads_dashboard';

interface PlanConfig {
  label: string;
  price_chf: number;
  features: Record<GatedFeature, number | boolean>;
}

export const PLAN_LIMITS: Record<PlanTier, PlanConfig> = {
  starter: {
    label: 'Starter (Gratuito)',
    price_chf: 0,
    features: {
      max_events_per_month: 2,
      analytics_access: false,
      challenge_creation: false,
      promoted_posts: false,
      ticket_sales: false,
      stories_link: false,
      custom_branding: false,
      priority_support: false,
      max_media_per_event: 5,
      ads_dashboard: false,
    },
  },
  basic: {
    label: 'Basic',
    price_chf: 49,
    features: {
      max_events_per_month: 10,
      analytics_access: true,
      challenge_creation: true,
      promoted_posts: false,
      ticket_sales: true,
      stories_link: false,
      custom_branding: false,
      priority_support: false,
      max_media_per_event: 20,
      ads_dashboard: false,
    },
  },
  pro: {
    label: 'Pro',
    price_chf: 129,
    features: {
      max_events_per_month: 50,
      analytics_access: true,
      challenge_creation: true,
      promoted_posts: true,
      ticket_sales: true,
      stories_link: true,
      custom_branding: true,
      priority_support: false,
      max_media_per_event: 50,
      ads_dashboard: false,
    },
  },
  premium: {
    label: 'Premium',
    price_chf: 299,
    features: {
      max_events_per_month: 999,
      analytics_access: true,
      challenge_creation: true,
      promoted_posts: true,
      ticket_sales: true,
      stories_link: true,
      custom_branding: true,
      priority_support: true,
      max_media_per_event: 100,
      ads_dashboard: true,
    },
  },
  artist_free: {
    label: 'Artista (Gratuito)',
    price_chf: 0,
    features: {
      max_events_per_month: 5,
      analytics_access: true,
      challenge_creation: false,
      promoted_posts: false,
      ticket_sales: false,
      stories_link: false,
      custom_branding: false,
      priority_support: false,
      max_media_per_event: 10,
      ads_dashboard: false,
    },
  },
  artist_pro: {
    label: 'Artista Pro',
    price_chf: 29,
    features: {
      max_events_per_month: 30,
      analytics_access: true,
      challenge_creation: true,
      promoted_posts: true,
      ticket_sales: true,
      stories_link: true,
      custom_branding: true,
      priority_support: true,
      max_media_per_event: 50,
      ads_dashboard: true,
    },
  },
};

/**
 * Check if a plan tier allows a specific feature.
 * Returns `true` for boolean features, or the numeric limit for capped features.
 */
export function canUseFeature(plan: PlanTier, feature: GatedFeature): boolean | number {
  const config = PLAN_LIMITS[plan];
  if (!config) return false;
  return config.features[feature];
}

/**
 * Check if a numeric feature limit has been reached.
 */
export function isWithinLimit(plan: PlanTier, feature: GatedFeature, currentCount: number): boolean {
  const limit = canUseFeature(plan, feature);
  if (typeof limit === 'boolean') return limit;
  return currentCount < limit;
}

/**
 * Get the display label for a plan tier.
 */
export function getPlanLabel(plan: PlanTier): string {
  return PLAN_LIMITS[plan]?.label ?? plan;
}

/**
 * Get the monthly price in CHF for a plan tier.
 */
export function getPlanPrice(plan: PlanTier): number {
  return PLAN_LIMITS[plan]?.price_chf ?? 0;
}
