'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { UserPlus, X, MapPin, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UserSuggestion {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  mutual_count?: number;
  common_interests?: string[];
}

interface ActiveUser {
  user_id: string;
  users: { id: string; username: string; display_name?: string; avatar_url?: string };
  venues: { name: string };
  created_at: string;
}

interface Props {
  suggestions: UserSuggestion[];
  activeTonight: ActiveUser[];
  currentUserId: string;
  followingIds: string[];
}

export default function DiscoverPeopleClient({ suggestions, activeTonight, currentUserId, followingIds }: Props) {
  const t = useTranslations('discover');
  const supabase = createClient();

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set(followingIds));

  const handleFollow = async (userId: string) => {
    if (following.has(userId)) {
      setFollowing(s => { const n = new Set(s); n.delete(userId); return n; });
      await (supabase.from('followers') as any).delete().match({ follower_id: currentUserId, following_id: userId, entity_type: 'user' });
    } else {
      setFollowing(s => new Set([...s, userId]));
      await (supabase.from('followers') as any).insert({ follower_id: currentUserId, following_id: userId, entity_type: 'user' });
    }
  };

  const handleFollowAll = async () => {
    const toFollow = suggestions.filter(s => !dismissed.has(s.id) && !following.has(s.id));
    setFollowing(s => new Set([...s, ...toFollow.map(u => u.id)]));
    await (supabase.from('followers') as any).insert(toFollow.map(u => ({ 
      follower_id: currentUserId, 
      following_id: u.id,
      entity_type: 'user'
    })));
  };

  const visible = suggestions.filter(s => !dismissed.has(s.id));

  return (
    <div className="page-container px-4 py-4">
      <h1 className="font-display text-2xl font-bold mb-6">{t('title')}</h1>

      {/* People you might know */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">{t('youMightKnow')}</h2>
          {visible.length > 0 && (
            <button onClick={handleFollowAll} className="text-sm text-vibe-purple font-semibold hover:opacity-80">
              {t('followAll')}
            </button>
          )}
        </div>
        {visible.length === 0 ? (
          <p className="text-vibe-text-secondary text-sm text-center py-8">{t('youMightKnow')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visible.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4 rounded-2xl relative"
              >
                <button
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-vibe-text-secondary hover:text-vibe-text"
                  onClick={() => setDismissed(s => new Set([...s, user.id]))}
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-vibe-surface border border-white/10 overflow-hidden flex items-center justify-center relative">
                    {user.avatar_url ? (
                      <Image 
                        src={user.avatar_url} 
                        alt="" 
                        fill
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-xl font-bold text-vibe-purple">
                        {(user.display_name || user.username)[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm truncate max-w-full">{user.display_name || user.username}</p>
                    <p className="text-xs text-vibe-text-secondary">@{user.username}</p>
                  </div>

                  {user.mutual_count !== undefined && user.mutual_count > 0 && (
                    <p className="text-xs text-vibe-purple">{t('mutualFollowers', { count: user.mutual_count })}</p>
                  )}

                  {user.common_interests?.length ? (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {user.common_interests.slice(0, 2).map(interest => (
                        <span key={interest} className="px-2 py-0.5 bg-vibe-purple/10 text-vibe-purple text-xs rounded-full">
                          {interest}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <button
                    onClick={() => handleFollow(user.id)}
                    className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${
                      following.has(user.id)
                        ? 'bg-white/10 text-vibe-text-secondary'
                        : 'bg-vibe-purple text-white hover:bg-vibe-purple/80'
                    }`}
                  >
                    {following.has(user.id) ? 'Seguendo' : 'Segui'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Active Tonight */}
      {activeTonight.length > 0 && (
        <section>
          <h2 className="font-semibold text-lg mb-4">🔥 {t('activeTonight')}</h2>
          <div className="space-y-3">
            {activeTonight.map((item, i) => (
              <motion.div
                key={`${item.user_id}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4 rounded-2xl flex items-center gap-3"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-vibe-surface border border-white/10 overflow-hidden flex items-center justify-center relative">
                    {item.users?.avatar_url ? (
                      <Image 
                        src={item.users.avatar_url} 
                        alt="" 
                        fill
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="font-bold text-vibe-purple">
                        {((item.users?.display_name || item.users?.username || 'U')[0]).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-vibe-dark" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{item.users?.display_name || item.users?.username}</p>
                  <div className="flex items-center gap-1 text-xs text-vibe-text-secondary">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{item.venues?.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleFollow(item.user_id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    following.has(item.user_id)
                      ? 'bg-white/10 text-vibe-text-secondary'
                      : 'bg-vibe-purple/20 text-vibe-purple hover:bg-vibe-purple/30'
                  }`}
                >
                  {following.has(item.user_id) ? '✓' : t('alsoThere')}
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
