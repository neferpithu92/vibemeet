'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

interface RSVPButtonProps {
  eventId: string;
  initialRsvpCount: number;
  initialIsAttending: boolean;
}

export default function RSVPButton({ eventId, initialRsvpCount, initialIsAttending }: RSVPButtonProps) {
  const [isAttending, setIsAttending] = useState(initialIsAttending);
  const [rsvpCount, setRsvpCount] = useState(initialRsvpCount);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleRSVP = async () => {
    setIsLoading(true);
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
        variant={isAttending ? 'secondary' : 'primary'} 
        className="w-full"
        onClick={handleRSVP}
        disabled={isLoading}
      >
        {isLoading ? 'Caricamento...' : isAttending ? '✅ Parteciperò' : '🎟️ Partecipa'}
      </Button>
      
      {/* Visualizzazione RSVP Count (opzionale, se vogliamo mostrarlo qui vicino) */}
      <p className="text-[10px] text-center text-vibe-text-secondary uppercase font-bold">
        {rsvpCount} persone partecipano
      </p>
    </div>
  );
}
