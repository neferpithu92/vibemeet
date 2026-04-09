import PricingSection from '@/components/social/PricingSection';
import { createClient } from '@/lib/supabase/server';
import { redirect } from '@/lib/i18n/navigation';
import { Link } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getTranslations } from 'next-intl/server';

/**
 * Pagina di Pricing pubblica (ma autenticata).
 */
export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('subscription');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login', locale });
  }

  // Carica info extra se necessario, e.g. se l'utente è un proprietario di venue
  const userId = user.id; // user is guaranteed at this point
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name')
    .eq('owner_id', userId);

  const primaryEntityId = venues?.[0]?.id || userId;
  const primaryEntityType = venues?.[0]?.id ? 'venue' : 'user';

  return (
    <div className="page-container">
      <div className="pt-8 px-4 text-center">
        <Badge variant="live">{t('launchOffer')}</Badge>
      </div>
      
      <PricingSection 
        entityId={primaryEntityId} 
        entityType={primaryEntityType as 'venue' | 'user'} 
      />

      <div className="max-w-4xl mx-auto px-4 pb-20">
        <div className="glass-card p-8 text-center bg-vibe-purple/5">
          <h3 className="font-bold text-lg mb-2">{t('corporateTitle')}</h3>
          <p className="text-sm text-vibe-text-secondary mb-6">
            {t('corporateSubtitle')}
          </p>
          <Button variant="ghost">{t('corporateContact')}</Button>
        </div>
      </div>
    </div>
  );
}

