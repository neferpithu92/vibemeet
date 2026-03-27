'use client';

import { useEffect } from 'react';
import { createClient } from './client';
import { useRouter } from '@/lib/i18n/navigation';

/**
 * Hook per abilitare aggiornamenti in tempo reale sulla mappa.
 * Ascolta i cambiamenti nelle tabelle 'events' e 'venues' e aggiorna i dati.
 */
export function useMapRealtime(onUpdate: () => void) {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Sottoscrizione ai cambiamenti delle venue
    const venuesChannel = supabase
      .channel('realtime:venues')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'venues' },
        () => {
          console.log('Realtime update: venues changed');
          onUpdate();
        }
      )
      .subscribe();

    // Sottoscrizione ai cambiamenti degli eventi
    const eventsChannel = supabase
      .channel('realtime:events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          console.log('Realtime update: events changed');
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(venuesChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [supabase, onUpdate]);
}
