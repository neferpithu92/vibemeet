'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Trophy, Star, Zap, Award } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const BADGES = [
  { id: 'explorer', emoji: '🎯', label: 'Explorer', desc: 'Check-in in 10 venue diverse', points: 100 },
  { id: 'music_lover', emoji: '🎵', label: 'Music Lover', desc: '5 eventi musicali', points: 75 },
  { id: 'social_butterfly', emoji: '🦋', label: 'Social Butterfly', desc: '100 follower', points: 150 },
  { id: 'vibe_creator', emoji: '🌟', label: 'Vibe Creator', desc: '50 post pubblicati', points: 200 },
  { id: 'regular', emoji: '🔥', label: 'Regular', desc: 'Check-in 7 giorni di fila', points: 125 },
  { id: 'vip', emoji: '🏆', label: 'VIP', desc: 'Account business verificato', points: 250 },
  { id: 'safe_buddy', emoji: '🛡️', label: 'Safe Buddy', desc: 'Safe Home usato 5 volte', points: 50 },
  { id: 'festival_goer', emoji: '🎪', label: 'Festival Goer', desc: '3 festival frequentati', points: 100 },
];

interface GamificationWidgetProps {
  userId: string;
  compact?: boolean;
}

interface UserStats {
  vibe_points: number;
  badges: string[];
  rank?: number;
}

export default function GamificationWidget({ userId, compact = false }: GamificationWidgetProps) {
  const t = useTranslations('gamification');
  const supabase = createClient();
  const [stats, setStats] = useState<UserStats>({ vibe_points: 0, badges: [] });
  const [newBadge, setNewBadge] = useState<typeof BADGES[0] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [userId]);

  const fetchStats = async () => {
    // Fetch points from user profile
    const { data: profile } = await (supabase
      .from('users') as any)
      .select('vibe_points')
      .eq('id', userId)
      .single();

    // Fetch earned badges
    const { data: badges } = await (supabase
      .from('user_badges') as any)
      .select('badge_id')
      .eq('user_id', userId);

    setStats({
      vibe_points: (profile as any)?.vibe_points || 0,
      badges: (badges as any[])?.map(b => b.badge_id) || []
    });
    setLoading(false);
  };

  const earnedBadges = BADGES.filter(b => stats.badges.includes(b.id));
  const lockedBadges = BADGES.filter(b => !stats.badges.includes(b.id));

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-vibe-purple/10 border border-vibe-purple/20 rounded-full px-3 py-1.5">
          <Zap className="w-4 h-4 text-vibe-purple" />
          <span className="font-bold text-sm text-vibe-purple">{stats.vibe_points.toLocaleString()}</span>
          <span className="text-xs text-vibe-text-secondary">{t('vibePoints')}</span>
        </div>
        {earnedBadges.slice(0, 3).map(b => (
          <span key={b.id} title={b.label} className="text-xl">{b.emoji}</span>
        ))}
        {earnedBadges.length > 3 && (
          <span className="text-xs text-vibe-text-secondary">+{earnedBadges.length - 3}</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Points header */}
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-xs text-vibe-text-secondary uppercase tracking-wider mb-1">{t('vibePoints')}</p>
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-vibe-purple" />
            <span className="font-display text-3xl font-bold text-vibe-purple">
              {stats.vibe_points.toLocaleString()}
            </span>
          </div>
        </div>
        {stats.rank && (
          <div className="text-center">
            <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-1" />
            <p className="text-xs text-vibe-text-secondary">{t('rank', { rank: stats.rank })}</p>
          </div>
        )}
      </div>

      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" /> {t('badges')}
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {BADGES.map(badge => {
              const earned = stats.badges.includes(badge.id);
              return (
                <motion.div
                  key={badge.id}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-center ${
                    earned
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-white/5 border-white/10 opacity-40 grayscale'
                  }`}
                >
                  <span className="text-2xl">{badge.emoji}</span>
                  <span className="text-[10px] font-semibold leading-tight">{badge.label}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next badge to earn */}
      {lockedBadges.length > 0 && (
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-xs text-vibe-text-secondary mb-3">PROSSIMO BADGE</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl opacity-50">{lockedBadges[0].emoji}</span>
            <div>
              <p className="font-semibold">{lockedBadges[0].label}</p>
              <p className="text-xs text-vibe-text-secondary">{lockedBadges[0].desc}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-vibe-purple font-bold">+{lockedBadges[0].points} pts</p>
            </div>
          </div>
        </div>
      )}

      {/* Badge earned notification */}
      <AnimatePresence>
        {newBadge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 glass-card px-6 py-4 rounded-2xl text-center border border-amber-500/30 bg-amber-500/10"
          >
            <span className="text-4xl">{newBadge.emoji}</span>
            <p className="font-bold mt-2">{t('earnedBadge')}</p>
            <p className="text-sm text-vibe-text-secondary">{newBadge.label}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
