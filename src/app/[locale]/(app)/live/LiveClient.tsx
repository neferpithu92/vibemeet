'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Radio, Eye, Heart, MessageCircle, Share2, Plus, Zap, X, Send, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/lib/i18n/navigation';

interface Stream {
  id: string;
  title: string;
  status: string;
  viewer_count: number;
  host: { id: string; username: string; display_name?: string; avatar_url?: string };
  event?: { id: string; title: string; cover_url?: string };
  playback_url?: string;
  created_at: string;
}

interface LiveClientProps {
  streams: Stream[];
  scheduled: Stream[];
  currentUserId?: string;
}

const REACTIONS = ['❤️', '🔥', '😂', '😮', '👏', '🎵'];

export default function LiveClient({ streams, scheduled, currentUserId }: LiveClientProps) {
  const t = useTranslations('live');
  const supabase = createClient();
  const router = useRouter();
  const [activeStreams, setActiveStreams] = useState(streams);
  const [viewing, setViewing] = useState<Stream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<{ id: string; user: string; text: string }[]>([]);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');

  useEffect(() => {
    if (!viewing) return;

    // Subscribe to reactions and viewer count
    const channel = supabase.channel(`stream:${viewing.id}`)
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const id = Math.random().toString(36).slice(2);
        setReactions(prev => [...prev, { id, emoji: payload.emoji, x: Math.random() * 80 + 10 }]);
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3000);
      })
      .on('broadcast', { event: 'comment' }, ({ payload }) => {
        setComments(prev => [...prev.slice(-50), payload]);
      })
      .on('broadcast', { event: 'viewers' }, ({ payload }) => {
        setViewerCount(payload.count);
      })
      .subscribe();

    // Notify join
    channel.send({ type: 'broadcast', event: 'viewers', payload: { count: viewing.viewer_count + 1 } });

    return () => { supabase.removeChannel(channel); };
  }, [viewing?.id]);

  const sendReaction = (emoji: string) => {
    if (!viewing) return;
    supabase.channel(`stream:${viewing.id}`).send({
      type: 'broadcast', event: 'reaction', payload: { emoji }
    });
  };

  const sendComment = () => {
    if (!comment.trim() || !viewing || !currentUserId) return;
    supabase.channel(`stream:${viewing.id}`).send({
      type: 'broadcast', event: 'comment', payload: {
        id: Date.now().toString(),
        user: 'tu',
        text: comment.trim()
      }
    });
    setComment('');
  };

  const goLive = async () => {
    if (!liveTitle.trim() || !currentUserId) return;
    const { data } = await supabase.from('live_streams').insert({
      host_id: currentUserId,
      title: liveTitle,
      status: 'live',
      started_at: new Date().toISOString()
    }).select().single();
    if (data) {
      setIsGoingLive(false);
      setActiveStreams(prev => [data as Stream, ...prev]);
    }
  };

  if (viewing) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Video area */}
        <div className="flex-1 relative bg-gradient-to-br from-vibe-purple/30 to-black flex items-center justify-center">
          {viewing.playback_url ? (
            <video src={viewing.playback_url} className="w-full h-full object-cover" autoPlay muted={false} />
          ) : (
            <div className="text-center">
              <div className="text-8xl mb-4">🎙️</div>
              <p className="text-white/60 text-sm">{t('streaming')}</p>
            </div>
          )}

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-red-500 rounded-full px-3 py-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-xs font-bold">LIVE</span>
              </div>
              <div className="flex items-center gap-1 bg-black/40 rounded-full px-3 py-1">
                <Eye className="w-3 h-3 text-white/70" />
                <span className="text-white text-xs">{viewerCount || viewing.viewer_count}</span>
              </div>
            </div>
            <button onClick={() => setViewing(null)} className="w-10 h-10 flex items-center justify-center bg-black/40 rounded-full text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stream info */}
          <div className="absolute top-16 left-4 flex items-center gap-2">
            <div className="w-10 h-10 rounded-full border-2 border-red-500 bg-vibe-surface overflow-hidden">
              {viewing.host?.avatar_url ? (
                <img src={viewing.host.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center font-bold text-vibe-purple">
                  {viewing.host?.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-white text-sm font-bold">{viewing.host?.display_name || viewing.host?.username}</p>
              <p className="text-white/60 text-xs">{viewing.title}</p>
            </div>
          </div>

          {/* Floating reactions */}
          {reactions.map(r => (
            <motion.div
              key={r.id}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -200 }}
              transition={{ duration: 3 }}
              className="absolute bottom-40 text-4xl pointer-events-none"
              style={{ left: `${r.x}%` }}
            >
              {r.emoji}
            </motion.div>
          ))}

          {/* Right side reactions */}
          <div className="absolute right-4 bottom-48 flex flex-col gap-3">
            {REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => sendReaction(emoji)}
                className="w-10 h-10 flex items-center justify-center bg-black/40 rounded-full text-xl hover:scale-125 transition-transform">
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Comments overlay */}
        <div className="absolute bottom-20 left-4 right-16 max-h-40 overflow-y-auto space-y-1 pointer-events-none">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-2">
              <span className="text-vibe-purple font-bold text-xs">{c.user}</span>
              <span className="text-white text-xs">{c.text}</span>
            </div>
          ))}
        </div>

        {/* Comment input */}
        <div className="flex items-center gap-2 px-4 py-3 bg-vibe-surface border-t border-white/5">
          <input
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendComment()}
            placeholder={t('placeholderComment')}
            className="flex-1 bg-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-white/40 outline-none"
          />
          <button onClick={sendComment} className="w-10 h-10 bg-vibe-purple rounded-full flex items-center justify-center">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Radio className="w-6 h-6 text-red-500" />
            {t('title')}
          </h1>
          <p className="text-vibe-text-secondary text-sm">{t('activeStreams', { count: activeStreams.length })}</p>
        </div>
        {currentUserId && (
          <button
            onClick={() => setIsGoingLive(true)}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all"
          >
            <Plus className="w-4 h-4" /> {t('goLive')}
          </button>
        )}
      </div>

      {/* Live streams grid */}
      {activeStreams.length === 0 ? (
        <div className="text-center py-16">
          <Radio className="w-16 h-16 mx-auto mb-4 text-vibe-text-secondary opacity-30" />
          <p className="font-bold text-lg mb-2">{t('noStreamsTitle')}</p>
          <p className="text-vibe-text-secondary text-sm">{t('noStreamsSubtitle')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-8">
          {activeStreams.map((stream, i) => (
            <motion.button
              key={stream.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => { setViewing(stream); setViewerCount(stream.viewer_count); }}
              className="relative rounded-2xl overflow-hidden bg-vibe-surface border border-white/10 text-left"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-vibe-purple/40 to-vibe-pink/20 relative">
                {stream.event?.cover_url && (
                  <img src={stream.event.cover_url} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 rounded-full px-2 py-0.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-[10px] font-bold">LIVE</span>
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 rounded-full px-2 py-0.5">
                  <Eye className="w-3 h-3 text-white" />
                  <span className="text-white text-[10px]">{stream.viewer_count}</span>
                </div>
              </div>
              {/* Info */}
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-vibe-dark border border-white/10 overflow-hidden flex-shrink-0">
                    {stream.host?.avatar_url ? (
                      <img src={stream.host.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-[10px] font-bold text-vibe-purple">
                        {stream.host?.username?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-vibe-text-secondary truncate">{stream.host?.display_name || stream.host?.username}</span>
                </div>
                <p className="text-sm font-semibold truncate">{stream.title}</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Scheduled */}
      {scheduled.length > 0 && (
        <div>
          <h2 className="font-semibold text-lg mb-4">{t('scheduled')}</h2>
          <div className="space-y-3">
            {scheduled.map(s => (
              <div key={s.id} className="glass-card p-4 rounded-2xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-vibe-purple/20 flex items-center justify-center">
                  <Radio className="w-5 h-5 text-vibe-purple" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.title}</p>
                  <p className="text-xs text-vibe-text-secondary">{s.host?.display_name || s.host?.username}</p>
                </div>
                <button className="px-3 py-1.5 bg-vibe-purple/20 text-vibe-purple text-xs rounded-xl font-semibold">
                  {t('reminder')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Go Live modal */}
      <AnimatePresence>
        {isGoingLive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center"
            onClick={() => setIsGoingLive(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-md bg-vibe-surface rounded-t-3xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="font-bold text-xl mb-6 text-center">🔴 {t('goLive')}</h2>
              <input
                type="text"
                value={liveTitle}
                onChange={e => setLiveTitle(e.target.value)}
                placeholder={t('placeholderTitle')}
                className="input-field mb-4"
                autoFocus
              />
              <button
                onClick={goLive}
                disabled={!liveTitle.trim()}
                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-lg transition-all"
              >
                {t('goLiveNow')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
