'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PLAN_LIMITS } from '../../lib/plans';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: PLAN_LIMITS.basic.price_chf.toString(),
    description: 'Perfetto per piccoli locali o artisti emergenti.',
    features: ['Visibilità mappa prioritaria', 'Analitiche base', '1 Post in evidenza / mese', 'Supporto email'],
    color: 'vibe-cyan',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: PLAN_LIMITS.pro.price_chf.toString(),
    description: 'La scelta migliore per locali attivi e organizzatori.',
    features: [
      'Tutto dello Starter',
      'Analitiche avanzate (heatmap live)',
      '5 Post in evidenza / mese',
      'RSVP illimitati',
      'Badge Pro verificato',
    ],
    color: 'vibe-purple',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: PLAN_LIMITS.premium.price_chf.toString(),
    description: 'Gestione completa per festival e grandi eventi.',
    features: [
      'Tutto del Pro',
      'Supporto dedicato 24/7',
      'Integrazioni API esterne',
      'Post in evidenza illimitati',
      'Eventi sponsorizzati garantiti',
    ],
    color: 'vibe-pink',
  },
];

interface PricingProps {
  entityId: string;
  entityType: 'venue' | 'artist' | 'user';
}

/**
 * Componente per la selezione dei piani di abbonamento.
 * Gestisce l'integrazione con l'API di checkout Stripe.
 */
export default function PricingSection({ entityId, entityType }: PricingProps) {
  const t = useTranslations('subscription');
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, entityId, entityType }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Errore durante il checkout');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Si è verificato un errore durante l\'inizializzazione del pagamento.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="py-12 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 vibe-gradient-text">
          {t('title')}
        </h2>
        <p className="text-vibe-text-secondary max-w-xl mx-auto">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative p-8 flex flex-col h-full border-t-4 transition-transform hover:scale-[1.02] ${
              plan.popular ? 'border-vibe-purple shadow-[0_0_30px_rgba(124,58,237,0.15)]' : 'border-white/10'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Badge variant="premium">{t('popular')}</Badge>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2">{t(`plans.${plan.id}.name`)}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price} CHF</span>
                <span className="text-vibe-text-secondary">{t('perMonth')}</span>
              </div>
              <p className="text-sm text-vibe-text-secondary mt-4">{t(`plans.${plan.id}.description`)}</p>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {(t.raw(`plans.${plan.id}.features`) as string[]).map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-vibe-text">
                  <span className={`text-${plan.color} font-bold`}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              variant={plan.popular ? 'primary' : 'secondary'}
              className="w-full"
              isLoading={loading === plan.id}
              onClick={() => handleSubscribe(plan.id)}
            >
              {t('subscribe')}
            </Button>
          </Card>
        ))}
      </div>
      
      <p className="text-center text-xs text-vibe-text-secondary mt-12">
        {t('secureNote')}
      </p>
    </div>
  );
}
