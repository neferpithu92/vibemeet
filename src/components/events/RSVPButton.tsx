'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

interface RSVPButtonProps {
  eventId: string;
  initialRsvpCount: number;
  initialIsAttending: boolean;
  price?: number;
  ticketUrl?: string;
  className?: string;
}

export default function RSVPButton({ eventId, initialRsvpCount, initialIsAttending, price, ticketUrl, className }: RSVPButtonProps) {
  const [isAttending, setIsAttending] = useState(initialIsAttending);
  const [rsvpCount, setRsvpCount] = useState(initialRsvpCount);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleRSVP = async () => {
    setIsLoading(true);

    // Se l'evento è a pagamento e l'utente non partecipa ancora, lo mandiamo al checkout
    if (price && price > 0 && !isAttending) {
      try {
        const res = await fetch('/api/payments/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId }),
        });
        const data = await res.json();
        if (data.checkoutUrl) {
          router.push(data.checkoutUrl);
          return;
        }
      } catch (err) {
        console.error('Checkout error:', err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const action = isAttending ? 'unrsvp' : 'rsvp';

    try {
      const res = await fetch('/api/social/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, action }),
      });

      if (res.ok) {
        setIsAttending(!isAttending);
        setRsvpCount(prev => isAttending ? prev - 1 : prev + 1);
      } else {
        const data = await res.json();
        if (data.error === 'Non autorizzato') {
          alert('Devi aver effettuato il login per partecipare!');
        }
      }
    } catch (err) {
      console.error('RSVP Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button 
        variant={isAttending ? 'secondary' : 'shining'} 
        size="md"
        className={cn(
          "w-full h-12 text-sm font-bold uppercase tracking-widest shadow-2xl transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]",
          isAttending ? "bg-vibe-purple/10 text-vibe-purple" : "bg-vibe-gradient",
          className
        )}
        onClick={handleRSVP}
        isLoading={isLoading}
      >
        <span className="mr-2 text-lg">{isAttending ? '✅' : (price && price > 0 ? '🎟️' : '🔥')}</span>
        {isAttending ? 'Parteciperò' : (price && price > 0 ? `Acquista (CHF ${price})` : 'Partecipa')}
      </Button>
      
      <p className="text-[10px] text-center text-vibe-text-secondary uppercase font-bold tracking-widest opacity-60">
        {rsvpCount} persone già confermate
      </p>
    </div>
  );
}
