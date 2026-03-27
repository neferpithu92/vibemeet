'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Check, Star, Zap, Crown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function SubscriptionManager() {
  const t = useTranslations('settings');
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSubscription() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('entity_id', user.id)
        .single();

      if (!error) setSubscription(data);
      setLoading(false);
    }
    fetchSubscription();
  }, [supabase]);

  const plans = [
    { id: 'starter', name: 'Starter', price: '0', icon: <Zap className="w-4 h-4" />, features: ['Map Visibility', 'Basic Profile', '5 Stories/day'] },
    { id: 'pro', name: 'Pro', price: '9.99', icon: <Star className="w-4 h-4 text-vibe-primary" />, features: ['Priority Support', 'Verified Badge', 'Unlimited Stories', 'Custom Themes'] },
    { id: 'premium', name: 'Premium', price: '19.99', icon: <Crown className="w-4 h-4 text-yellow-500" />, features: ['All Pro features', 'AI Event Assistant', 'Incognito Mode', 'Revenue Sharing'] }
  ];

  if (loading) return <div className="animate-pulse h-40 bg-white/5 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">{t('currentPlan', { fallback: 'Piano Attuale' })}</h3>
            <p className="text-vibe-text-secondary text-sm">
              {subscription?.plan ? subscription.plan.toUpperCase() : 'STARTER'}
            </p>
          </div>
          <Badge variant="premium" className="bg-vibe-primary/20 text-vibe-primary border-vibe-primary/30 py-1 px-3">
            {subscription?.status || 'Active'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`p-4 rounded-xl border transition-all ${
                (subscription?.plan || 'starter') === plan.id 
                  ? 'bg-vibe-primary/10 border-vibe-primary' 
                  : 'bg-white/5 border-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {plan.icon}
                <span className="font-bold text-white">{plan.name}</span>
              </div>
              <div className="text-2xl font-black text-white mb-4">
                {plan.price} <span className="text-xs font-normal text-vibe-text-secondary">CHF/mo</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-vibe-text-secondary">
                    <Check className="w-3 h-3 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button 
                variant={(subscription?.plan || 'starter') === plan.id ? 'secondary' : 'primary'}
                className="w-full text-xs h-8"
                disabled={(subscription?.plan || 'starter') === plan.id}
              >
                {(subscription?.plan || 'starter') === plan.id ? t('active', { fallback: 'Attivo' }) : t('upgrade', { fallback: 'Passa a ' + plan.name })}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
