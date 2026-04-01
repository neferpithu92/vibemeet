'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/ToastProvider';
import { useNotificationStore, Notification } from '@/stores/useNotificationStore';

/**
 * Componente invisibile che osserva i cambiamenti in tempo reale nel DB
 * e mostra notifiche toast per eventi rilevanti (es. nuovi eventi vicini).
 * Ora include anche la gestione real-time delle notifiche personali.
 */
export default function RealtimeObserver() {
  const { showToast } = useToast();
  const supabase = createClient();
  const userLocation = useRef<{ lat: number; lng: number } | null>(null);
  const { addNotification } = useNotificationStore();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    init();

    // 1. Chiedi la posizione dell'utente per geo-aware alerts
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        userLocation.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      });
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    // 2. Iscrizione Realtime agli eventi pubblici (es. nuovi eventi)
    const eventsChannel = supabase
      .channel('public:events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'events'
      }, (payload) => {
        const newEvent = payload.new;
        showToast(`Nuovo evento: ${newEvent.title}`, 'info', '🎉');
      })
      .subscribe();

    // 3. Iscrizione Realtime alle NOTIFICHE PERSONALI (P2P)
    const notificationsChannel = supabase
      .channel(`personal:notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, async (payload) => {
        const { data } = await supabase
          .from('notifications')
          .select(`
            *,
            actor:users!notifications_actor_id_fkey (
              display_name,
              avatar_url
            )
          `)
          .eq('id', payload.new.id)
          .single();
        
        if (data) {
          const n = data as Notification;
          addNotification(n);
          
          // Mostra toast per interazioni importanti
          const iconMap = {
            like: '❤️',
            follow: '👤',
            comment: '💬',
            event_reminder: '⏰',
            rsvp: '⭐',
            checkin: '📍'
          };
          
          showToast(
            `${n.actor?.display_name || 'VIBE'}: ${n.message}`, 
            'info', 
            iconMap[n.type as keyof typeof iconMap] || '🔔'
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [userId, showToast, addNotification]);

  return null; // Componente di servizio, non renderizza nulla
}
