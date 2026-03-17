'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';

interface CheckInButtonProps {
  venueId?: string;
  eventId?: string;
}

export default function CheckInButton({ venueId, eventId }: CheckInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleCheckIn = async () => {
    setIsLoading(true);
    
    // Ottieni posizione reale se possibile
    let location = null;
    if ('geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (err) {
        console.warn('Geolocation failed or denied');
      }
    }

    try {
      const res = await fetch('/api/social/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId, eventId, location }),
      });

      if (res.ok) {
        showToast('Check-in completato! 📍', 'success', '👋');
      } else {
        const data = await res.json();
        if (data.error === 'Non autorizzato') {
          showToast('Devi essere loggato per fare il check-in', 'error', '🔒');
        } else {
          showToast('Errore durante il check-in', 'error', '❌');
        }
      }
    } catch (err) {
      console.error('Check-in Error:', err);
      showToast('Errore di connessione', 'error', '🔌');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="secondary" 
      className="w-full"
      onClick={handleCheckIn}
      disabled={isLoading}
    >
      {isLoading ? 'In corso...' : '📍 Check-in'}
    </Button>
  );
}
