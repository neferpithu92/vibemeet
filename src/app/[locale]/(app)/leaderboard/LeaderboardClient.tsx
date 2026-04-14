'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Target, Crown, Medal, Award, ChevronRight, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Leader {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  vibe_points: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  reward_points: number; // DB column name
  points?: number;       // alias for display
  target_count?: number;
  end_date: string;      // DB column name
  ends_at?: string;      // alias for display
}

interface Participation {
  challenge_id: string;
  progress: number;
  completed: boolean;
}

interface LeaderboardClientProps {
  leaders: Leader[];
  challenges: Challenge[];
  currentUserId?: string;
  userRank: number | null;
  userParticipations: Participation[];
}

const RANK_COLORS = ['text-amber-400', 'text-slate-300', 'text-amber-700'];
const RANK_ICONS = ['🥇', '🥈', '🥉'];

export default function LeaderboardClient({
  leaders,
  challenges,
  currentUserId,
  userRank,
  userParticipations
}: LeaderboardClientProps) {
  const supabase = createClient();
  const [tab, setTab] = useState<'rankings' | 'challenges'>('rankings');
  const [joining, setJoining] = useState<string | null>(null);
  const [participations, setParticipations] = useState(userParticipations);

  const joinChallenge = async (challengeId: string) => {
    if (!currentUserId) return;
    setJoining(challengeId);
    await (supabase as any).from('challenge_participants').upsert({
      challenge_id: challengeId,
      user_id: currentUserId,
      post_id: '00000000-0000-0000-0000-000000000000', // placeholder required by PK
    }, { onConflict: 'challenge_id,user_id,post_id' });
    setParticipations(prev => [...prev, { challenge_id: challengeId, progress: 0, completed: false }]);
    setJoining(null);
  };

  const getParticipation = (id: string) => participations.find(p => p.challenge_id === id);

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);
  const currentUser = leaders.find(l => l.id === currentUserId);

  function formatPoints(n: number) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }

  function timeLeft(date: string) {
    const diff = new Date(date).getTime() - Date.now();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}g ${hours}h`;
    return `${hours}h`;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 text-center">
        <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-2" />
        <h1 className="font-display text-2xl font-bold">Leaderboard</h1>
        {userRank && currentUser && (
          <p className="text-vibe-text-secondary text-sm mt-1">
            Il tuo rank: <span className="text-vibe-purple font-bold">#{userRank}</span> · {formatPoints(currentUser.vibe_points)} pts
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex mx-4 mb-6 bg-vibe-surface rounded-2xl p-1">
        {[
          { id: 'rankings', label: '🏆 Classifica' },
          { id: 'challenges', label: '⚡ Challenge' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-vibe-purple text-white' : 'text-vibe-text-secondary hover:text-vibe-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'rankings' && (
        <div className="px-4">
          {/* Top 3 podium */}
          <div className="flex items-end justify-center gap-3 mb-8 px-4">
            {/* 2nd */}
            {top3[1] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex-1 flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-full border-2 border-slate-300 overflow-hidden bg-vibe-surface mb-2">
                  {top3[1].avatar_url ? (
                    <img src={top3[1].avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center font-bold text-slate-300 text-xl">
                      {(top3[1].display_name || top3[1].username)[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold truncate max-w-[80px] text-center">{top3[1].display_name || top3[1].username}</p>
                <p className="text-xs text-slate-300 font-bold">{formatPoints(top3[1].vibe_points)} pts</p>
                <div className="w-full h-16 bg-slate-300/20 rounded-t-xl mt-2 flex items-center justify-center text-2xl">🥈</div>
              </motion.div>
            )}
            {/* 1st */}
            {top3[0] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col items-center -mb-4"
              >
                <Crown className="w-6 h-6 text-amber-400 mb-1" />
                <div className="w-18 h-18 w-[72px] h-[72px] rounded-full border-3 border-amber-400 border-[3px] overflow-hidden bg-vibe-surface mb-2">
                  {top3[0].avatar_url ? (
                    <img src={top3[0].avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center font-bold text-amber-400 text-2xl">
                      {(top3[0].display_name || top3[0].username)[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold truncate max-w-[90px] text-center">{top3[0].display_name || top3[0].username}</p>
                <p className="text-xs text-amber-400 font-bold">{formatPoints(top3[0].vibe_points)} pts</p>
                <div className="w-full h-24 bg-amber-400/20 rounded-t-xl mt-2 flex items-center justify-center text-3xl">🥇</div>
              </motion.div>
            )}
            {/* 3rd */}
            {top3[2] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex-1 flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-full border-2 border-amber-700 overflow-hidden bg-vibe-surface mb-2">
                  {top3[2].avatar_url ? (
                    <img src={top3[2].avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center font-bold text-amber-700 text-xl">
                      {(top3[2].display_name || top3[2].username)[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold truncate max-w-[80px] text-center">{top3[2].display_name || top3[2].username}</p>
                <p className="text-xs text-amber-700 font-bold">{formatPoints(top3[2].vibe_points)} pts</p>
                <div className="w-full h-10 bg-amber-700/20 rounded-t-xl mt-2 flex items-center justify-center text-2xl">🥉</div>
              </motion.div>
            )}
          </div>

          {/* Rest of rankings */}
          <div className="space-y-2">
            {rest.map((leader, i) => {
              const rank = i + 4;
              const isMe = leader.id === currentUserId;
              return (
                <motion.div
                  key={leader.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    isMe ? 'bg-vibe-purple/10 border border-vibe-purple/30' : 'bg-white/5'
                  }`}
                >
                  <span className="w-7 text-sm font-bold text-vibe-text-secondary text-center">#{rank}</span>
                  <div className="w-10 h-10 rounded-full bg-vibe-surface border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {leader.avatar_url ? (
                      <img src={leader.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-vibe-purple">
                        {(leader.display_name || leader.username)[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {leader.display_name || leader.username}
                      {isMe && <span className="ml-1 text-vibe-purple text-xs">(tu)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-vibe-purple">
                    <Zap className="w-3 h-3" />
                    <span className="text-sm font-bold">{formatPoints(leader.vibe_points)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'challenges' && (
        <div className="px-4 space-y-4">
          {challenges.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 mx-auto mb-3 text-vibe-text-secondary opacity-30" />
              <p className="text-vibe-text-secondary">Nessuna challenge attiva</p>
            </div>
          ) : challenges.map((ch, i) => {
            const participation = getParticipation(ch.id);
            const pct = participation ? Math.min(((participation.progress) / (ch.target_count || ch.reward_points || 100)) * 100, 100) : 0;

            const endsAt = ch.ends_at || ch.end_date || '';

            return (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 rounded-2xl"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold">{ch.title}</h3>
                    <p className="text-sm text-vibe-text-secondary mt-0.5">{ch.description}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-vibe-purple/10 rounded-full px-2 py-1 ml-3">
                    <Zap className="w-3 h-3 text-vibe-purple" />
                    <span className="text-xs font-bold text-vibe-purple">+{ch.points}</span>
                  </div>
                </div>

                {participation ? (
                  <>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-vibe-text-secondary">Progresso</span>
                      <span className={participation.completed ? 'text-green-400 font-bold' : 'text-vibe-text-secondary'}>
                        {participation.completed ? '✅ Completata!' : `${participation.progress}/${ch.target_count}`}
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${participation.completed ? 'bg-green-400' : 'bg-vibe-purple'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => joinChallenge(ch.id)}
                    disabled={joining === ch.id}
                    className="w-full mt-2 bg-vibe-purple/20 hover:bg-vibe-purple/30 text-vibe-purple font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
                  >
                    {joining === ch.id ? 'Partecipando...' : '⚡ Partecipa'}
                  </button>
                )}

                <p className="text-xs text-vibe-text-secondary mt-2">
                  ⏰ Scade in {timeLeft(endsAt)}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="h-24" />
    </div>
  );
}
