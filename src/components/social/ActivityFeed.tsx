'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
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

    checkins?.forEach(c => {
      merged.push({
        id: c.id,
        type: 'check_in',
        user: c.user as any,
        target_name: c.venue?.name || c.event?.title || 'VIBE',
        target_url: c.venue ? `/venues/${c.venue.slug || c.venue.id}` : `/events/${c.event?.id}`,
        created_at: c.created_at
      });
    });

    followers?.forEach(f => {
      merged.push({
        id: Math.random().toString(), // No unique ID in followers PK
        type: f.venue ? 'follow' : 'follow', // simplified
        user: f.user as any,
        target_name: f.venue?.name || f.following_user?.username || 'User',
        target_url: f.venue ? `/venues/${f.venue.slug || f.venue.id}` : `/profile/${f.following_user?.id}`,
        created_at: f.created_at
      });
    });

    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setActivities(merged);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchActivities();

    // Subscribe to new check-ins for real-time feed
    const channel = supabase
      .channel('global_activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'check_ins' }, () => fetchActivities())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'followers' }, () => fetchActivities())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
    if (item.type === 'check_in') return `ha fatto check-in presso`;
    if (item.type === 'follow') return `ha iniziato a seguire`;
    return `ha partecipato a`;
  };

  return (
    <Card className="p-4 bg-vibe-dark/40 backdrop-blur-xl border-white/5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-vibe-text-secondary mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        Attività Live
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
          <AnimatePresence>
            {activities.map((item, idx) => (
              <motion.div
                key={item.id + idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-3 items-start group"
              >
                <Avatar src={item.user.avatar_url || ''} fallback={item.user.username[0]} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-vibe-text-primary leading-snug">
                    <span className="font-bold">@{item.user.username}</span>{' '}
                    <span className="text-vibe-text-secondary">{getActivityText(item)}</span>{' '}
                    <Link href={item.target_url} className="text-vibe-purple font-semibold hover:text-vibe-pink transition-colors">
                      {item.target_name}
                    </Link>
                  </p>
                  <p className="text-[10px] text-vibe-text-secondary mt-1">
                    {getActivityIcon(item.type)} {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: locale === 'it' ? it : enUS })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <p className="text-xs text-vibe-text-secondary text-center py-4 italic">Nessuna attività recente</p>
        )}
      </div>
    </Card>
  );
}
