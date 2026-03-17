'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook per tracciare la posizione dell'utente e inviarla al server (Heartbeat).
 * Aggiorna la posizione ogni 5 minuti se l'utente è attivo sulla pagina.
 */
export function useUserLocation() {
  const lastUpdate = useRef<number>(0);
  const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minuti

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    const updatePresence = async (position: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastUpdate.current < UPDATE_INTERVAL) return;

      const { latitude, longitude } = position.coords;

      try {
        const res = await fetch('/api/presence/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude, longitude }),
        });

        if (res.ok) {
          lastUpdate.current = now;
          console.log('[Presence] Posizione aggiornata con successo');
        }
      } catch (err) {
        console.error('[Presence] Errore invio posizione:', err);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn(`[Presence] Geolocation error: ${error.message}`);
    };

    // Richiesta iniziale e monitoraggio
    const watchId = navigator.geolocation.watchPosition(updatePresence, handleError, {
      enableHighAccuracy: false,
      maximumAge: 30000,
      timeout: 27000,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);
}
