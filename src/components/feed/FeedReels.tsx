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
  url: string;
  type: 'photo' | 'video';
  caption?: string;
  hashtags?: string[];
  location_name?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified?: boolean;
    display_name?: string;
  };
}

interface FeedReelsProps {
  initialReels?: ReelItem[];
}

const SWIPE_THRESHOLD = 80;

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

  const fetchReels = useCallback(async (currentCursor: string | null) => {
    setIsLoading(true);
    try {
      const url = `/api/feed/foryou?limit=10&type=reels${currentCursor ? `&cursor=${currentCursor}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const newReels = data.items || [];
        
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
    if (initialReels.length === 0) fetchReels(null);
  }, [fetchReels, initialReels.length]);

  useEffect(() => {
    const currentReel = reels[currentIndex];
    if (!currentReel) return;

    mutationManager.record({
      post_id: currentReel.id,
      author_id: currentReel.profiles?.id || 'unknown',
      type: 'view',
      affinity_inc: 0.1
    });

    videoRefs.current.forEach((video, id) => {
      if (id === currentReel.id) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex, reels]);

  const navigateTo = useCallback((direction: 'up' | 'down') => {
    setCurrentIndex(prev => {
      if (direction === 'up' && prev > 0) return prev - 1;
      if (direction === 'down' && prev < reels.length - 1) return prev + 1;
      return prev;
    });
  }, [reels.length]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const { velocity, offset } = info;
    if (offset.y < -SWIPE_THRESHOLD || velocity.y < -300) navigateTo('down');
    else if (offset.y > SWIPE_THRESHOLD || velocity.y > 300) navigateTo('up');
  }, [navigateTo]);

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
      mutationManager.record({
        post_id: reelId,
        author_id: reels[currentIndex]?.profiles?.id || 'unknown',
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

  if (isLoading && reels.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="w-12 h-12 border-4 border-vibe-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentReel = reels[currentIndex];
  if (!currentReel) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black z-50 overflow-hidden touch-none select-none">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentReel.id}
          style={{ y, opacity }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -200, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
          className="absolute inset-0 flex items-center justify-center"
          onClick={(e) => handleDoubleTap(e, currentReel.id)}
        >
          <div className="absolute inset-0">
            {currentReel.type === 'video' ? (
              <video
                ref={(el) => { if (el) videoRefs.current.set(currentReel.id, el); }}
                src={currentReel.url}
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
                preload="auto"
              />
            ) : (
              <img src={currentReel.url} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
          </div>

          {/* Controls Bar */}
          <div className="absolute right-4 bottom-28 flex flex-col items-center gap-6 z-20">
            <button 
              onClick={(e) => { e.stopPropagation(); }}
              className="flex flex-col items-center gap-1 active:scale-90 transition-all"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/10 ${likedReels.has(currentReel.id) ? 'bg-vibe-pink text-white' : 'bg-white/10 text-white'}`}>
                <Heart size={26} fill={likedReels.has(currentReel.id) ? 'currentColor' : 'none'} />
              </div>
              <span className="text-[11px] font-bold drop-shadow-lg text-white">{currentReel.likes_count}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveCommentReel(currentReel.id); }}
              className="flex flex-col items-center gap-1 active:scale-90 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white">
                <MessageCircle size={26} />
              </div>
              <span className="text-[11px] font-bold drop-shadow-lg text-white">{currentReel.comments_count}</span>
            </button>
            <button className="flex flex-col items-center gap-1 active:scale-90 transition-all text-white">
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center">
                <Send size={24} />
              </div>
              <span className="text-[11px] font-bold drop-shadow-lg">Condividi</span>
            </button>
          </div>

          <div className="absolute bottom-8 left-4 right-20 z-20">
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={currentReel.profiles?.avatar_url || ''} fallback={currentReel.profiles?.username?.[0] || 'U'} hasStory={true} />
              <div className="flex flex-col">
                 <span className="font-bold text-white text-sm shadow-sm tracking-tight">@{currentReel.profiles?.username}</span>
                 {currentReel.location_name && <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">📍 {currentReel.location_name}</span>}
              </div>
              <Button size="sm" className="h-7 px-3 text-[10px] font-bold uppercase bg-white/20 hover:bg-white/30 backdrop-blur-md border-0 ml-2">Segui</Button>
            </div>
            <p className="text-sm text-white/90 leading-relaxed mb-4 line-clamp-3 drop-shadow-md">{currentReel.caption}</p>
          </div>

          <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
             <Link href="/feed">
                <button className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white"><ChevronLeft size={28} /></button>
             </Link>
             <h2 className="text-white font-black tracking-tighter text-xl">REELS</h2>
             <div className="w-10"></div>
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showHeart && (
          <motion.div
            key={showHeart.id}
            initial={{ scale: 0.5, opacity: 0, x: '-50%', y: '-50%' }}
            animate={{ scale: [0.5, 1.8, 1], opacity: [0, 1, 0] }}
            className="fixed z-[100] pointer-events-none"
            style={{ left: showHeart.x, top: showHeart.y }}
          >
            <Heart size={100} fill="#EC4899" color="white" />
          </motion.div>
        )}
      </AnimatePresence>

      <CommentsDrawer
        isOpen={!!activeCommentReel}
        onClose={() => setActiveCommentReel(null)}
        entityId={activeCommentReel || ''}
      />
    </div>
  );
}
