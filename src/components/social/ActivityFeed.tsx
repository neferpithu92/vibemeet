'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { it, enUS, de, fr } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';

interface ActivityItem {
  id: string;
  type: 'check_in' | 'follow' | 'rsvp';
  user: {
    username: string;
    avatar_url: string | null;
  };
  target_name: string;
  target_url: string;
  created_at: string;
}

export default function ActivityFeed() {
  const t = useTranslations('social');
  const locale = useLocale();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchActivities = async () => {
    setIsLoading(true);
    
    // Fetch Check-ins
    const { data: checkins } = await supabase
      .from('check_ins')
      .select(`
        id,
        created_at,
        user:users(username, avatar_url),
        venue:venues(name, slug, id),
        event:events(title, id)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch Followers
    const { data: followers } = await supabase
      .from('followers')
      .select(`
        created_at,
        user:users!followers_follower_id_fkey(username, avatar_url),
        following_user:users!followers_following_id_fkey(username, id),
        venue:venues(name, slug, id)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    const merged: ActivityItem[] = [];

    checkins?.forEach((c) => {
      const user = Array.isArray(c.user) ? c.user[0] : c.user;
      const venue = Array.isArray(c.venue) ? c.venue[0] : c.venue;
      const event = Array.isArray(c.event) ? c.event[0] : c.event;

      if (!user) return;

      merged.push({
        id: c.id,
        type: 'check_in',
        user: {
          username: user.username,
          avatar_url: user.avatar_url
        },
        target_name: venue?.name || event?.title || 'VIBE',
        target_url: venue ? `/venues/${venue.slug || venue.id}` : `/events/${event?.id}`,
        created_at: c.created_at
      });
    });

    followers?.forEach((f) => {
      const user = Array.isArray(f.user) ? f.user[0] : f.user;
      const followingUser = Array.isArray(f.following_user) ? f.following_user[0] : f.following_user;
      const venue = Array.isArray(f.venue) ? f.venue[0] : f.venue;

      if (!user) return;

      merged.push({
        id: Math.random().toString(),
        type: 'follow', // simplified
        user: {
          username: user.username,
          avatar_url: user.avatar_url
        },
        target_name: venue?.name || followingUser?.username || 'User',
        target_url: venue ? `/venues/${venue.slug || venue.id}` : `/profile/${followingUser?.id}`,
        created_at: f.created_at
      });
    });

    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setActivities(merged);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchActivities().catch(console.error);

    // Subscribe to new check-ins for real-time feed
    const channel = supabase
      .channel('global_activity')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'check_ins' }, () => {
        fetchActivities().catch(console.error);
      })
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'followers' }, () => {
        fetchActivities().catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(console.error);
    };
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'check_in': return '📍';
      case 'follow': return '👤';
      case 'rsvp': return '🎟️';
      default: return '✨';
    }
  };

  const getActivityText = (item: ActivityItem) => {
    if (item.type === 'check_in') return t('activity.checkIn');
    if (item.type === 'follow') return t('activity.follow');
    return t('activity.participate');
  };

  return (
    <Card className="p-4 bg-vibe-dark/40 backdrop-blur-xl border-white/5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-vibe-text-secondary mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        {t('activity.liveTitle', { fallback: 'Attività Live' })}
      </h3>

      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 bg-white/5 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/5 rounded w-3/4" />
                <div className="h-2 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : activities.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {activities.map((item, idx) => (
              <motion.div
                key={item.id + idx}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ 
                  delay: idx * 0.08, 
                  type: 'spring', 
                  stiffness: 400, 
                  damping: 25 
                }}
                className="flex gap-3 items-start group hover:bg-white/5 p-2 -mx-2 rounded-2xl transition-colors cursor-pointer"
              >
                <div className="relative">
                  <Avatar src={item.user.avatar_url || ''} fallback={item.user.username[0]} size="sm" />
                  <div className="absolute -bottom-1 -right-1 text-[10px] bg-vibe-dark rounded-full p-0.5 border border-white/10 shadow-lg z-10">
                    {getActivityIcon(item.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-[13px] text-vibe-text-primary leading-tight">
                    <span className="font-extrabold text-white">@{item.user.username}</span>{' '}
                    <span className="text-white/60">{getActivityText(item)}</span>{' '}
                    <Link href={item.target_url} className="text-vibe-cyan font-bold hover:text-white transition-colors">
                      {item.target_name}
                    </Link>
                  </p>
                  <p className="text-[10px] text-white/40 mt-0.5 font-medium uppercase tracking-wider">
                    {formatDistanceToNow(new Date(item.created_at), { 
                      addSuffix: true, 
                      locale: locale === 'it' ? it : locale === 'de' ? de : locale === 'fr' ? fr : enUS 
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <p className="text-xs text-vibe-text-secondary text-center py-4 italic">{t('activity.noRecent', { fallback: 'Nessuna attività recente' })}</p>
        )}
      </div>
    </Card>
  );
}
