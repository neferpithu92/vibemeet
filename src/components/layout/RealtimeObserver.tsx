'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/ToastProvider';

/**
 * Componente invisibile che osserva i cambiamenti in tempo reale nel DB
 * e mostra notifiche toast per eventi rilevanti (es. nuovi eventi vicini).
 */
export default function RealtimeObserver() {
  const { showToast } = useToast();
  const supabase = createClient();
  const userLocation = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // 1. Chiedi la posizione dell'utente
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        userLocation.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      });
    }

    // 2. Iscrizione Realtime agli eventi
    const channel = supabase
      .channel('public:events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'events'
      }, (payload) => {
        const newEvent = payload.new;
        
        // Calcola distanza (molto semplificata per il demo)
        // Se l'evento è stato creato, lo notifichiamo. 
        // In una versione reale useremmo ST_DWithin nel DB o una funzione più complessa.
        showToast(`Nuovo evento: ${newEvent.title}`, 'info', '🎉');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, showToast]);

  return null; // Componente di servizio, non renderizza nulla
}
