'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useNotificationStore, Notification } from '@/stores/useNotificationStore';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { it, enUS, de, fr } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { Bell, Heart, UserPlus, MessageSquare, Star, Calendar, CheckSquare, Trash2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

export default function NotificationsPage() {
  const t = useTranslations('nav');
  const tn = useTranslations('settings'); // Reusing some strings for labels
  const locale = useLocale();
  const supabase = createClient();
  
  const { 
    notifications, 
    unreadCount, 
    fetchNotifications, 
    markAllAsRead, 
    markAsRead,
    isLoading 
  } = useNotificationStore();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetchNotifications(user.id);
      }
    };
    init();
  }, []);

  const handleMarkAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await markAllAsRead(user.id);
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-5 h-5 text-vibe-pink fill-vibe-pink" />;
      case 'follow': return <UserPlus className="w-5 h-5 text-vibe-purple" />;
      case 'comment': return <MessageSquare className="w-5 h-5 text-vibe-cyan" />;
      case 'event_reminder': return <Calendar className="w-5 h-5 text-vibe-pink" />;
      case 'rsvp': return <Star className="w-5 h-5 text-vibe-pink" />;
      case 'checkin': return <CheckSquare className="w-5 h-5 text-vibe-cyan" />;
      default: return <Bell className="w-5 h-5 text-vibe-purple" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-2xl font-bold font-display vibe-gradient-text ml-12">
            {t('notifications')}
          </h1>
        </div>
        
        {unreadCount > 0 && (
          <Button 
            onClick={handleMarkAllRead}
            variant="outline"
            size="sm"
            className="text-xs gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Segna tutte come lette
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {isLoading && notifications.length === 0 ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse h-24" />
          ))
        ) : notifications.length > 0 ? (
          <AnimatePresence initial={false}>
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={() => !n.read_at && markAsRead(n.id)}
                className={`
                  glass-card p-4 flex gap-4 cursor-pointer transition-all hover:bg-white/5
                  ${!n.read_at ? 'border-l-4 border-vibe-purple bg-vibe-purple/5' : 'border-l-4 border-transparent opacity-80'}
                `}
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 p-[1px] bg-vibe-gradient">
                    <div className="w-full h-full rounded-full bg-vibe-dark overflow-hidden p-0.5">
                       <Avatar
                        src={n.actor?.avatar_url || undefined}
                        fallback={n.actor?.display_name?.[0] || '?'}
                        size="md"
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-vibe-dark flex items-center justify-center p-1 border border-white/10">
                    {getIcon(n.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`font-bold truncate ${n.read_at ? 'text-vibe-text' : 'text-vibe-purple'}`}>
                      {n.actor?.display_name || 'VIBE'}
                    </p>
                    <span className="text-xs text-vibe-text-secondary whitespace-nowrap">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: getDateLocale() })}
                    </span>
                  </div>
                  <p className="text-sm text-vibe-text-secondary line-clamp-2">
                    {n.message}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <EmptyState
            icon={Bell}
            title="Silenzo assoluto..."
            description="Non hai ancora ricevuto notifiche. Interagisci con la mappa e il feed per attirare l'attenzione! 🚀"
          />
        )}
      </div>
    </div>
  );
}
