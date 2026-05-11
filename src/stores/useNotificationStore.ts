import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'mention'
  | 'event'
  | 'checkin'
  | 'system'
  | 'event_reminder'
  | 'rsvp';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  actor?: {
    id?: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  entity_type: string;
  entity_id: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
}

interface NotificationState {
  notifications:           Notification[];
  unreadCount:             number;
  isLoading:               boolean;
  error:                   string | null;
  lastFetched:             number | null;
  fetchNotifications:      (userId: string) => Promise<void>;
  markAsRead:              (notificationId: string) => Promise<void>;
  markAllAsRead:           () => Promise<void>;
  deleteNotification:      (notificationId: string) => Promise<void>;
  addNotification:         (notification: Notification) => void;
  subscribeToNotifications:(userId: string) => () => void;
  reset:                   () => void;
}

// Cache: ri-fetch solo dopo 30s dall'ultimo
const FETCH_COOLDOWN_MS = 30_000;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount:   0,
  isLoading:     false,
  error:         null,
  lastFetched:   null,

  // ── Fetch ──────────────────────────────────────────────────
  fetchNotifications: async (userId: string) => {
    const { lastFetched, isLoading } = get();

    // Throttle: evita refetch troppo frequenti
    if (isLoading) return;
    if (lastFetched && Date.now() - lastFetched < FETCH_COOLDOWN_MS) return;

    set({ isLoading: true, error: null });

    try {
      const res = await fetch('/api/notifications?limit=50&offset=0', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const notifications = (json.data?.notifications ?? []) as Notification[];
      const unreadCount   = (json.data?.unreadCount   ?? 0) as number;

      set({
        notifications,
        unreadCount,
        isLoading:   false,
        lastFetched: Date.now(),
      });
    } catch (err: any) {
      console.error('[NotificationStore] fetch error:', err.message);
      set({ isLoading: false, error: err.message });
    }
  },

  // ── Mark singola come letta ────────────────────────────────
  markAsRead: async (notificationId: string) => {
    // Aggiornamento ottimistico
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    try {
      await fetch('/api/notifications', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ notificationId }),
      });
    } catch (err: any) {
      console.error('[NotificationStore] markAsRead error:', err.message);
    }
  },

  // ── Mark tutte come lette ──────────────────────────────────
  markAllAsRead: async () => {
    const now = new Date().toISOString();
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read_at: now })),
      unreadCount:   0,
    }));

    try {
      await fetch('/api/notifications', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ markAll: true }),
      });
    } catch (err: any) {
      console.error('[NotificationStore] markAllAsRead error:', err.message);
    }
  },

  // ── Elimina notifica ───────────────────────────────────────
  deleteNotification: async (notificationId: string) => {
    const prev = get().notifications;
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== notificationId),
      unreadCount:   state.notifications.find(n => n.id === notificationId && !n.read_at)
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
    }));

    try {
      const res = await fetch(`/api/notifications?id=${notificationId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err: any) {
      // Rollback
      set({ notifications: prev });
      console.error('[NotificationStore] delete error:', err.message);
    }
  },

  // ── Aggiungi da realtime ───────────────────────────────────
  addNotification: (notification: Notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications].slice(0, 100),
      unreadCount:   state.unreadCount + 1,
    }));
  },

  // ── Realtime subscription ──────────────────────────────────
  subscribeToNotifications: (userId: string) => {
    const supabase = createClient();

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const newNotif = payload.new as Notification;

          // Arricchisce con dati actor
          if (newNotif.actor_id) {
            const { data: actor } = await (supabase.from('users') as any)
              .select('id, display_name, username, avatar_url')
              .eq('id', newNotif.actor_id)
              .single();

            if (actor) newNotif.actor = actor;
          }

          get().addNotification(newNotif);
        }
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Sincronizza read_at da altri dispositivi
          const updated = payload.new as Notification;
          set(state => ({
            notifications: state.notifications.map(n =>
              n.id === updated.id ? { ...n, read_at: updated.read_at } : n
            ),
            unreadCount: state.notifications.filter(n =>
              n.id === updated.id ? !updated.read_at : !n.read_at
            ).length,
          }));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[NotificationStore] Realtime active for user ${userId.slice(0, 8)}...`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // ── Reset (logout) ─────────────────────────────────────────
  reset: () => {
    set({
      notifications: [],
      unreadCount:   0,
      isLoading:     false,
      error:         null,
      lastFetched:   null,
    });
  },
}));
