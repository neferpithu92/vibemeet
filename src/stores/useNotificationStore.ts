import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export type NotificationType = 'like' | 'comment' | 'follow' | 'event_reminder' | 'rsvp' | 'checkin';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string;
  actor?: {
    display_name: string;
    avatar_url: string;
  };
  entity_type: string;
  entity_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  subscribeToNotifications: (userId: string) => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (userId: string) => {
    set({ isLoading: true });
    const supabase = createClient();
    
    const { data, error } = await (supabase
      .from('notifications') as any)
      .select(`
        *,
        actor:users!notifications_actor_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[NotificationStore] Fetch failed:', error);
      set({ isLoading: false });
      return;
    }

    const unread = (data as any[]).filter(n => !n.read_at).length;
    set({ notifications: (data as any[]), unreadCount: unread, isLoading: false });
  },

  markAsRead: async (notificationId: string) => {
    const supabase = createClient();
    const { error } = await (supabase
      .from('notifications') as any)
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (!error) {
      set(state => ({
        notifications: state.notifications.map(n => 
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    }
  },

  markAllAsRead: async (userId: string) => {
    const supabase = createClient();
    const { error } = await (supabase
      .from('notifications') as any)
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (!error) {
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read_at: new Date().toISOString() })),
        unreadCount: 0
      }));
    }
  },

  addNotification: (notification: Notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1
    }));
  },

  subscribeToNotifications: (userId: string) => {
    const supabase = createClient();
    
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          const newNotif = payload.new as Notification;
          
          // Fetch actor details for the new notification
          const { data: actor } = await (supabase
            .from('users') as any)
            .select('display_name, avatar_url')
            .eq('id', newNotif.actor_id)
            .single();
            
          if (actor) {
            newNotif.actor = actor as any;
          }
          
          get().addNotification(newNotif);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}));
