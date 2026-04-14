'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { X, Heart, Flame, Laugh, Zap, ThumbsUp, Eye, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface Story {
  id: string;
  media_url: string;
  author_id: string;
  author?: { username: string; avatar_url?: string; display_name?: string };
  created_at: string;
  expires_at: string;
  type?: 'photo' | 'video' | 'text';
  duration?: number;
  text_content?: string;
  text_color?: string;
  bg_color?: string;
}

export interface StoryGroup {
  userId: string;
  user: { username: string; avatar_url?: string; display_name?: string };
  stories: Story[];
}

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  currentUserId?: string;
}

const REACTIONS = ['❤️', '🔥', '😂', '😮', '👏'];
const PHOTO_DURATION = 5000;

export default function StoryViewer({ groups, initialGroupIndex, onClose, currentUserId }: StoryViewerProps) {
  const t = useTranslations('stories');
  const supabase = createClient();

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [sentReaction, setSentReaction] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState<number | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startYRef = useRef<number>(0);
  const progressStartRef = useRef<number>(0);
  const pauseRef = useRef(false);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const isOwnStory = currentStory?.author_id === currentUserId;
  const isVideo = currentStory?.media_url?.match(/\.(mp4|webm|mov)$/i) || currentStory?.type === 'video';
  const duration = isVideo ? (currentStory?.duration || 15) * 1000 : PHOTO_DURATION;

  // Mark story as viewed
  useEffect(() => {
    if (!currentStory || !currentUserId) return;
    (supabase.from('story_views') as any).upsert({
      story_id: currentStory.id,
      viewer_id: currentUserId,
      viewed_at: new Date().toISOString()
    }, { onConflict: 'story_id,viewer_id' }).then(() => {});
    if (isOwnStory) {
      (supabase.from('story_views') as any).select('count', { count: 'exact' })
        .eq('story_id', currentStory.id).then(({ count }: any) => setViewCount(count || 0));
    }
  }, [currentStory?.id]);

  const goNext = useCallback(() => {
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(s => s + 1);
      setProgress(0);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(g => g + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [storyIndex, currentGroup?.stories.length, groupIndex, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(s => s - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      setGroupIndex(g => g - 1);
      setStoryIndex(groups[groupIndex - 1].stories.length - 1);
      setProgress(0);
    }
  }, [storyIndex, groupIndex, groups]);

  // Progress timer
  useEffect(() => {
    setProgress(0);
    progressStartRef.current = Date.now();
    pauseRef.current = false;

    const tick = () => {
      if (pauseRef.current) return;
      const elapsed = Date.now() - progressStartRef.current;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        goNext();
      } else {
        intervalRef.current = setTimeout(tick, 50);
      }
    };

    intervalRef.current = setTimeout(tick, 50);
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };
  }, [storyIndex, groupIndex, duration]);

  const handlePause = () => { pauseRef.current = true; setIsPaused(true); };
  const handleResume = () => {
    progressStartRef.current = Date.now() - (progress / 100) * duration;
    pauseRef.current = false;
    setIsPaused(false);
  };

  // Swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => { startYRef.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - startYRef.current;
    if (dy > 80) onClose();
  };

  const handleTap = (e: React.MouseEvent) => {
    const x = e.clientX;
    const w = window.innerWidth;
    if (x < w / 2) goPrev(); else goNext();
  };

  const handleReact = async (emoji: string) => {
    setSentReaction(emoji);
    setShowReactions(false);
    setTimeout(() => setSentReaction(null), 2000);
    // TODO: send reaction via DM
  };

  const handleReply = async () => {
    if (!replyText.trim() || !currentUserId) return;
    setReplyText('');
    // TODO: send reply via DM
  };

  const timeAgo = (date: string) => {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return t('secondsAgo', { count: Math.floor(diff) });
    if (diff < 3600) return t('minutesAgo', { count: Math.floor(diff / 60) });
    return t('hoursAgo', { count: Math.floor(diff / 3600) });
  };

  if (!currentGroup || !currentStory) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Story Content */}
        <div className="relative w-full h-full max-w-md mx-auto">
          {/* Progress Bars */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2 pt-safe">
            {currentGroup.stories.map((_, i) => (
              <div key={i} className="h-[2px] flex-1 bg-white/30 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%'
                  }}
                  transition={{ duration: 0 }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-vibe-surface flex items-center justify-center">
                {currentGroup.user.avatar_url ? (
                  <img src={currentGroup.user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{currentGroup.user.username[0]?.toUpperCase()}</span>
                )}
              </div>
              <div>
                <p className="text-white text-sm font-semibold drop-shadow">{currentGroup.user.display_name || currentGroup.user.username}</p>
                <p className="text-white/70 text-xs">{timeAgo(currentStory.created_at)}</p>
              </div>
              {isOwnStory && viewCount !== null && (
                <div className="flex items-center gap-1 bg-black/40 rounded-full px-2 py-1">
                  <Eye className="w-3 h-3 text-white/70" />
                  <span className="text-xs text-white/70">{viewCount}</span>
                </div>
              )}
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Media */}
          <div
            className="w-full h-full flex items-center justify-center cursor-pointer select-none"
            onClick={handleTap}
            onMouseDown={handlePause}
            onMouseUp={handleResume}
            onTouchStart={() => handlePause()}
            onTouchEnd={() => { handleResume(); }}
          >
            {currentStory.type === 'text' ? (
              <div
                className="w-full h-full flex items-center justify-center p-8"
                style={{ backgroundColor: currentStory.bg_color || '#7C3AED' }}
              >
                <p
                  className="text-center text-3xl font-bold"
                  style={{ color: currentStory.text_color || '#FFFFFF' }}
                >
                  {currentStory.text_content}
                </p>
              </div>
            ) : isVideo ? (
              <video
                ref={videoRef}
                src={currentStory.media_url}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
                loop={false}
              />
            ) : (
              <img
                src={currentStory.media_url}
                alt="story"
                className="w-full h-full object-cover"
                draggable={false}
              />
            )}
          </div>

          {/* Gradient overlay bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />

          {/* Reactions floating */}
          <AnimatePresence>
            {sentReaction && (
              <motion.div
                initial={{ scale: 0, y: 0, opacity: 1 }}
                animate={{ scale: 1.5, y: -100, opacity: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-40 left-1/2 -translate-x-1/2 z-30 text-4xl pointer-events-none"
              >
                {sentReaction}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom — Reaction + Reply */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 space-y-3">
            {/* Emoji reactions */}
            <div className="flex items-center justify-center gap-3">
              {REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full text-xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Reply bar */}
            {!isOwnStory && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onFocus={handlePause}
                  onBlur={handleResume}
                  placeholder={t('replyToStory')}
                  className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm text-white placeholder-white/50 outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleReply()}
                />
                <button
                  onClick={handleReply}
                  className="w-10 h-10 flex items-center justify-center bg-vibe-purple rounded-full"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>

          {/* Group navigation arrows */}
          {groupIndex > 0 && (
            <button onClick={() => { setGroupIndex(g => g - 1); setStoryIndex(0); setProgress(0); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {groupIndex < groups.length - 1 && (
            <button onClick={() => { setGroupIndex(g => g + 1); setStoryIndex(0); setProgress(0); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white">
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
