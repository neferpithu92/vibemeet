'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { useTranslations } from 'next-intl';
import { MapPin, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface CheckInButtonProps {
  venueId?: string;
  eventId?: string;
  className?: string;
}

export default function CheckInButton({ venueId, eventId, className }: CheckInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const t = useTranslations('social');

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
        showToast(t('checkInSuccess'), 'success', '📍');
      } else {
        const data = await res.json();
        if (res.status === 401) {
          showToast(t('loginRequired'), 'error', '🔒');
        } else {
          showToast(t('checkInError'), 'error', '❌');
        }
      }
    } catch (err) {
      console.error('Check-in Error:', err);
      showToast(t('connectionError'), 'error', '🔌');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="secondary" 
      className={className || "w-full rounded-xl py-6 flex items-center justify-center gap-2 font-bold tracking-tight bg-white/5 border-white/10 hover:bg-vibe-purple/10 hover:border-vibe-purple/30 transition-all tap-bounce"}
      onClick={handleCheckIn}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-vibe-purple" />
      ) : (
        <>
          <MapPin className="w-5 h-5" />
          {t('checkIn')}
        </>
      )}
    </Button>
  );
}
