'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Link } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Heart, MessageCircle, Send, MapPin, ChevronLeft, ChevronUp } from 'lucide-react';
import CommentsDrawer from './CommentsDrawer';
import { mutationManager } from '@/lib/social/MutationManager';


interface ReelItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption?: string;
  hashtags?: string[];
  location_name?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

interface FeedReelsProps {
  initialReels?: ReelItem[];
}

const SWIPE_THRESHOLD = 80;

/**
 * FeedReels — Vertical swipe-based content feed (TikTok/Reels style).
 * Uses Framer Motion for smooth vertical swipe with spring physics.
 * Videos auto-play when in view and pause when swiped away.
 */
export default function FeedReels({ initialReels = [] }: FeedReelsProps) {
  const t = useTranslations('feed');
  const supabase = createClient();

  const [reels, setReels] = useState<ReelItem[]>(initialReels);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(initialReels.length === 0);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showHeart, setShowHeart] = useState<{ id: string, x: number, y: number } | null>(null);
  const [activeCommentReel, setActiveCommentReel] = useState<string | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const y = useMotionValue(0);
  const opacity = useTransform(y, [-200, 0, 200], [0.5, 1, 0.5]);

  // Fetch reels from the API
  const fetchReels = useCallback(async (currentCursor: string | null) => {
    setIsLoading(true);
    try {
      const url = `/api/feed/foryou?limit=10&type=reels${currentCursor ? `&cursor=${currentCursor}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Assuming data.items returns ReelItems. Filtering locally if backend returns mixed content
        const newReels = (data.items || []).filter((item: any) => item.media_type === 'video');
        
        // NEW: Populate likedReels state from backend results
        const newlyLiked = newReels
          .filter((r: any) => r.is_liked)
          .map((r: any) => r.id);
        
        if (newlyLiked.length > 0) {
          setLikedReels(prev => {
            const next = new Set(prev);
            newlyLiked.forEach((id: string) => next.add(id));
            return next;
          });
        }

        // If not enough video items returned, we might consider we've hit the end for reels (simplification)
        if (!data.nextCursor || newReels.length === 0) setHasMore(false);
        setCursor(data.nextCursor || null);
        
        setReels(prev => !currentCursor ? newReels : [...prev, ...newReels]);
      }
    } catch (err) {
      console.error('[Reels] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialReels.length === 0) {
      fetchReels(null);
    }
  }, [fetchReels, initialReels.length]);

  // Auto-play current video, pause others + Record View
  useEffect(() => {
    const currentReel = reels[currentIndex];
    if (!currentReel) return;

    // Set User ID for MutationManager
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) mutationManager.setUserId(user.id);
    });

    // Record View Interaction
    mutationManager.record({
      post_id: currentReel.id,
      author_id: currentReel.user.id,
      type: 'view',
      affinity_inc: 0.1
    });

    // Tracking watch time (simplified)
    const startTime = Date.now();
    const watchTimer = setTimeout(() => {
      mutationManager.record({
        post_id: currentReel.id,
        author_id: currentReel.user.id,
        type: 'view',
        watch_time: 5,
        affinity_inc: 0.2 // Higher affinity for longer watch
      });
    }, 5000);

    videoRefs.current.forEach((video, id) => {
      if (id === currentReel.id) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });

    return () => {
      clearTimeout(watchTimer);
    };
  }, [currentIndex, reels, supabase.auth]);

  // Prefetch next batch when near end
  useEffect(() => {
    if (currentIndex >= reels.length - 3 && hasMore && !isLoading && cursor) {
      fetchReels(cursor);
    }
  }, [currentIndex, reels.length, hasMore, isLoading, cursor, fetchReels]);

  const navigateTo = useCallback((direction: 'up' | 'down') => {
    setCurrentIndex(prev => {
      if (direction === 'up' && prev > 0) return prev - 1;
      if (direction === 'down' && prev < reels.length - 1) return prev + 1;
      return prev;
    });
  }, [reels.length]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const { velocity, offset } = info;
    if (offset.y < -SWIPE_THRESHOLD || velocity.y < -300) {
      navigateTo('down');
    } else if (offset.y > SWIPE_THRESHOLD || velocity.y > 300) {
      navigateTo('up');
    }
  }, [navigateTo]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') navigateTo('down');
      if (e.key === 'ArrowUp' || e.key === 'k') navigateTo('up');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateTo]);

  // Double-tap to like
  const lastTap = useRef<number>(0);
  const handleDoubleTap = useCallback((e: React.MouseEvent, reelId: string) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setShowHeart({ id: Date.now().toString(), x: e.clientX, y: e.clientY });
      setTimeout(() => setShowHeart(null), 1000);

      setLikedReels(prev => {
        const next = new Set(prev);
        next.add(reelId);
        return next;
      });
      // Fire API call and record interaction
      mutationManager.record({
        post_id: reelId,
        author_id: reels[currentIndex]?.user.id,
        type: 'like',
        affinity_inc: 2.0
      });
      fetch('/api/social/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: reelId, entityType: 'media', action: 'like' }),
      }).catch(() => {});
    }
    lastTap.current = now;
  }, [currentIndex, reels]);

  const handleLike = useCallback(async (reelId: string) => {
    const isLiked = likedReels.has(reelId);
    setLikedReels(prev => {
      const next = new Set(prev);
      isLiked ? next.delete(reelId) : next.add(reelId);
      return next;
    });
    try {
      if (!isLiked) {
        mutationManager.record({
          post_id: reelId,
          author_id: reels[currentIndex]?.user.id,
          type: 'like',
          affinity_inc: 2.0
        });
      }
      await fetch('/api/social/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: reelId, entityType: 'media', action: isLiked ? 'unlike' : 'like' }),
      });
    } catch { /* optimistic, no revert */ }
  }, [likedReels, currentIndex, reels]);

  if (isLoading && reels.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="w-12 h-12 border-4 border-vibe-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 text-center px-6">
        <span className="text-6xl mb-4">🎬</span>
        <h2 className="text-2xl font-display font-bold text-white mb-2">Nessun Reel disponibile</h2>
        <p className="text-vibe-text-secondary text-sm">I contenuti video appariranno qui appena disponibili.</p>
      </div>
    );
  }

  const currentReel = reels[currentIndex];

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 overflow-hidden touch-none select-none"
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentReel.id}
          style={{ y, opacity }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute inset-0 flex items-center justify-center"
          onClick={(e) => handleDoubleTap(e, currentReel.id)}
        >
          {/* Media */}
          <div className="absolute inset-0">
            {currentReel.media_type === 'video' ? (
              <video
                ref={(el) => { if (el) videoRefs.current.set(currentReel.id, el); }}
                src={currentReel.media_url}
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
                preload="auto"
              />
            ) : (
              <img
                src={currentReel.media_url}
                alt={currentReel.caption || ''}
                className="w-full h-full object-cover"
              />
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
          </div>

          {/* Right action bar */}
            <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10">
            {/* Like */}
            <button
              onClick={(e) => { e.stopPropagation(); handleLike(currentReel.id); }}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                likedReels.has(currentReel.id) ? 'bg-vibe-pink/30 shadow-[0_0_15px_rgba(255,45,145,0.4)]' : 'bg-white/10'
              }`}>
                <Heart 
                  className="w-7 h-7"
                  fill={likedReels.has(currentReel.id) ? '#FF2D91' : 'none'}
                  color={likedReels.has(currentReel.id) ? '#FF2D91' : 'white'}
                />
              </div>
              <span className="text-xs text-white font-bold drop-shadow-md">
                {currentReel.likes_count + (likedReels.has(currentReel.id) ? 1 : 0)}
              </span>
            </button>

            {/* Comment */}
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveCommentReel(currentReel.id); }}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs text-white font-bold drop-shadow-md">{currentReel.comments_count}</span>
            </button>

            {/* Share */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (navigator.share) {
                  navigator.share({ title: currentReel.caption || 'VIBE Reel', url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                <Send className="w-6 h-6 text-white ml-1" /> {/* ml-1 to visually center Send icon */}
              </div>
              <span className="text-xs text-white font-bold drop-shadow-md">Share</span>
            </button>

            {/* Map pin — link to location */}
            {currentReel.location_name && (
              <button className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
              </button>
            )}
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-6 left-4 right-20 z-10">
            {/* User info */}
            <div className="flex items-center gap-3 mb-3">
              <Link href={`/u/${currentReel.user.username}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <Avatar 
                  src={currentReel.user.avatar_url || ''} 
                  fallback={currentReel.user.username[0]} 
                  size="md" 
                />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <Link href={`/u/${currentReel.user.username}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <span className="font-bold text-white text-sm hover:underline">
                      @{currentReel.user.username}
                    </span>
                  </Link>
                  {currentReel.user.is_verified && <Badge variant="verified">✓</Badge>}
                </div>
                {currentReel.location_name && (
                  <p className="text-xs text-white/70 flex items-center gap-1">
                    📍 {currentReel.location_name}
                  </p>
                )}
              </div>
            </div>

            {/* Caption */}
            {currentReel.caption && (
              <p className="text-sm text-white/90 leading-relaxed line-clamp-3 mb-2">
                {currentReel.caption}
              </p>
            )}

            {/* Hashtags */}
            {currentReel.hashtags && currentReel.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {currentReel.hashtags.slice(0, 5).map(tag => (
                  <span key={tag} className="text-xs font-bold text-vibe-cyan">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-safe bg-gradient-to-b from-black/50 to-transparent">
            <Link href="/feed" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            </Link>
            <h1 className="font-display font-bold text-white text-lg tracking-wide">Reels</h1>
            <div className="w-10" /> {/* Spacer */}
          </div>

          {/* Progress indicator */}
          <div className="absolute top-16 left-0 right-0 flex gap-1 px-4 z-10">
            {reels.slice(Math.max(0, currentIndex - 2), currentIndex + 5).map((reel, i) => (
              <div
                key={reel.id}
                className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${
                  reel.id === currentReel.id ? 'bg-white' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Swipe hint (shown only for the first reel) */}
      {currentIndex === 0 && (
        <motion.div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [0, 1, 0], y: [10, 0, -10] }}
          transition={{ repeat: 3, duration: 1.5, delay: 1 }}
        >
          <ChevronUp className="w-6 h-6 text-white/80 drop-shadow-md" />
          <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest drop-shadow-md mt-1">Esplora</span>
        </motion.div>
      )}

      {/* Double Tap Heart Animation */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            key={showHeart.id}
            initial={{ scale: 0.5, opacity: 0, x: '-50%', y: '-50%', rotate: -15 }}
            animate={{ scale: [0.5, 1.5, 1], opacity: [0, 1, 0], rotate: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed z-[100] pointer-events-none"
            style={{ left: showHeart.x, top: showHeart.y }}
          >
            <Heart 
              className="w-28 h-28 text-vibe-pink drop-shadow-[0_0_20px_rgba(255,45,145,0.7)]" 
              fill="#FF2D91" 
              color="white" 
              strokeWidth={1} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Drawer */}
      <CommentsDrawer
        isOpen={!!activeCommentReel}
        onClose={() => setActiveCommentReel(null)}
        entityId={activeCommentReel || ''}
      />
    </div>
  );
}
