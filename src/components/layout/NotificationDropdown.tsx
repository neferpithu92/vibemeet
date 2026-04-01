'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Heart, UserPlus, MessageSquare, Star, Calendar, CheckSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { it, enUS, de, fr } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { useNotificationStore, Notification } from '@/stores/useNotificationStore';
import { Link } from '@/lib/i18n/navigation';

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const supabase = createClient();
  
  const { 
    notifications, 
    unreadCount, 
    fetchNotifications, 
    markAllAsRead, 
    addNotification 
  } = useNotificationStore();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetchNotifications(user.id);

        // Realtime Subscription
        const channel = supabase
          .channel(`user-notifications-${user.id}`)
          .on(
            'postgres_changes',
            { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            async (payload) => {
              // Fetch the full notification with actor details
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
              
              if (data) addNotification(data as Notification);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    init();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleMarkAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await markAllAsRead(user.id);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-vibe-pink fill-vibe-pink" />;
      case 'follow': return <UserPlus className="w-4 h-4 text-vibe-purple" />;
      case 'comment': return <MessageSquare className="w-4 h-4 text-vibe-cyan" />;
      case 'event_reminder': return <Calendar className="w-4 h-4 text-vibe-pink" />;
      case 'rsvp': return <Star className="w-4 h-4 text-vibe-pink" />;
      case 'checkin': return <CheckSquare className="w-4 h-4 text-vibe-cyan" />;
      default: return <Bell className="w-4 h-4 text-vibe-purple" />;
    }
  };

  const getDateLocale = () => {
    switch (locale) {
      case 'it': return it;
      case 'de': return de;
      case 'fr': return fr;
      default: return enUS;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className="relative p-2 rounded-xl text-vibe-text-secondary hover:text-vibe-text hover:bg-white/5 transition-all group"
      >
        <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-vibe-pink rounded-full ring-2 ring-vibe-dark group-hover:animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-12 w-80 sm:w-96 glass-card overflow-hidden z-50 shadow-2xl origin-top-right border border-white/10"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h3 className="font-display font-bold text-sm">Notifiche</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="text-[10px] uppercase font-bold tracking-widest text-vibe-purple hover:text-vibe-pink transition-colors"
                >
                  Segna tutte come lette
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div 
                    key={n.id}
                    className={`p-4 flex gap-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 relative ${!n.read_at ? 'bg-vibe-purple/5' : ''}`}
                  >
                    <div className="relative shrink-0">
                      {n.actor ? (
                        <img src={n.actor.avatar_url || 'https://via.placeholder.com/150'} alt="" className="w-10 h-10 rounded-full border border-white/10" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-vibe-gradient/20 flex items-center justify-center">
                          <Bell className="w-5 h-5 text-vibe-purple" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-vibe-dark flex items-center justify-center p-0.5">
                        <div className="w-full h-full rounded-full flex items-center justify-center bg-white/5">
                          {getIcon(n.type)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-bold truncate ${n.read_at ? 'text-vibe-text' : 'text-vibe-purple'}`}>
                          {n.actor?.display_name || 'VIBE'}
                        </p>
                        <span className="text-[10px] text-vibe-text-secondary whitespace-nowrap">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: getDateLocale() })}
                        </span>
                      </div>
                      <p className="text-xs text-vibe-text-secondary leading-relaxed">{n.message}</p>
                    </div>

                    {!n.read_at && (
                      <div className="absolute top-4 right-1 w-1.5 h-1.5 rounded-full bg-vibe-purple" />
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-vibe-text-secondary opacity-50">
                  <Bell className="w-12 h-12 mb-3 stroke-[1px]" />
                  <p className="text-sm">Nessuna notifica</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/5 text-center bg-white/5">
              <Link 
                href="/notifications" 
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-vibe-text-secondary hover:text-white transition-colors"
              >
                Visualizza tutte
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
