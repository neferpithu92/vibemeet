'use client';

import { useEffect } from 'react';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/ToastProvider';

export function NotificationListener() {
  const { subscribeToNotifications, fetchNotifications } = useNotificationStore();
  const { showToast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Initial fetch
        await fetchNotifications(user.id);
        
        // Subscribe to real-time changes
        unsubscribe = subscribeToNotifications(user.id);
        
        // Listen for new notifications in state to show toast
        const unsubscribeStore = useNotificationStore.subscribe(
          (state, prevState) => {
            if (state.notifications.length > prevState.notifications.length) {
              const newNotif = state.notifications[0];
              if (newNotif && !prevState.notifications.find(n => n.id === newNotif.id)) {
                showToast(newNotif.message, 'info');
                
                // Optional: Browser push notification
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('VIBIMEET', {
                    body: newNotif.message,
                    icon: '/favicon.ico'
                  });
                }
              }
            }
          }
        );

        return () => {
          unsubscribeStore();
        };
      }
    };

    const cleanupPromise = init();

    return () => {
      if (unsubscribe) unsubscribe();
      // Handle the cleanup from inside the async init if needed
    };
  }, [supabase, subscribeToNotifications, fetchNotifications, showToast]);

  // Request permission for push notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return null; // This component doesn't render anything
}
