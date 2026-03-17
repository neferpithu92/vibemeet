import PricingSection from '@/components/social/PricingSection';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Link } from '@/lib/i18n/navigation';

/**
 * Pagina di Pricing pubblica (ma autenticata).
 */
export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Carica info extra se necessario, e.g. se l'utente è un proprietario di venue
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name')
    .eq('owner_id', user.id);

  const primaryEntityId = venues?.[0]?.id || user.id;
  const primaryEntityType = venues?.[0]?.id ? 'venue' : 'user';

  return (
    <div className="page-container">
      <div className="pt-8 px-4 text-center">
        <Badge variant="live">OFFERTA LANCIO</Badge>
      </div>
      
      <PricingSection 
        entityId={primaryEntityId} 
        entityType={primaryEntityType as 'venue' | 'user'} 
      />

      <div className="max-w-4xl mx-auto px-4 pb-20">
        <div className="glass-card p-8 text-center bg-vibe-purple/5">
          <h3 className="font-bold text-lg mb-2">Hai domande sul piano Corporate?</h3>
          <p className="text-sm text-vibe-text-secondary mb-6">
            Offriamo soluzioni personalizzate per reti di locali, discoteche su più piani e grandi festival in tutta la Svizzera.
          </p>
          <Button variant="ghost">Contatta il team Business</Button>
        </div>
      </div>
    </div>
  );
}

