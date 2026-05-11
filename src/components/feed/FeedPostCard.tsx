'use client';

import { useState, useEffect, memo } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { ShareModal } from '@/components/social/ShareModal';
import { cn } from '@/lib/utils';
import { Link } from '@/lib/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { createClient } from '@/lib/supabase/client';

interface FeedPostCardProps {
  post: {
    id: string;
    url: string;
    type: string;
    caption?: string;
    created_at: string;
    profiles?: {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    };
    author_username?: string;
    author_display_name?: string | null;
    author_avatar?: string | null;
    author_is_verified?: boolean;
    like_count?: number;
    comment_count?: number;
    view_count?: number;
  };
  isLiked?: boolean;
  isSaved?: boolean;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onComment: (id: string) => void;
  hover?: boolean;
  shining?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const FeedPostCard = memo(({ post, isLiked, isSaved, onLike, onSave, onComment, hover, shining, padding = 'none', onClick }: FeedPostCardProps) => {
  const t = useTranslations('feed');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count || 0);
  const [localIsLiked, setLocalIsLiked] = useState(isLiked || false);
  const [heartAnimation, setHeartAnimation] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  
  // Sync con props esterne
  useEffect(() => {
    setLocalIsLiked(isLiked || false);
  }, [isLiked]);

  const { ref: viewRef, inView } = useInView({
    threshold: 0.5,
    triggerOnce: true
  });

  useEffect(() => {
    if (inView && !hasTrackedView) {
      setHasTrackedView(true);
      // Track view in background
      fetch('/api/social/batch-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interactions: [{
            post_id: post.id,
            type: 'view',
            watch_time: 0,
            affinity_inc: 0.05
          }]
        })
      }).catch(() => {});
    }
  }, [inView, hasTrackedView, post.id]);

  const handleLike = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const newLiked = !localIsLiked;
    setLocalIsLiked(newLiked);
    setLocalLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));
    
    if (newLiked) {
      setHeartAnimation(true);
      setTimeout(() => setHeartAnimation(false), 800);
    }

    try {
      await fetch('/api/social/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: post.id,
          entityType: 'media',
          action: newLiked ? 'like' : 'unlike',
        }),
      });
      onLike(post.id);
    } catch (err) {
      // Rollback ottimistico in caso di errore
      setLocalIsLiked(!newLiked);
      setLocalLikeCount(prev => newLiked ? Math.max(0, prev - 1) : prev + 1);
      console.error('[FeedPostCard] Like error:', err);
    }
  };

  const authorUsername = post.author_username || post.profiles?.username || 'unknown';
  const authorDisplayName = post.author_display_name || post.profiles?.display_name || authorUsername;
  const authorAvatar = post.author_avatar || post.profiles?.avatar_url;

  return (
    <Card 
      ref={viewRef} 
      onClick={onClick}
      className={cn(
        "overflow-hidden transition-all duration-300",
        shining ? 'vibe-shining-border' : (hover ? 'glass-card-hover' : 'glass-card')
      )}
    >
      {/* Header — Author Info */}
      <div className="flex items-center justify-between p-4">
        <Link href={`/u/${authorUsername}` as any} className="flex items-center gap-3 group tap-bounce">
          <div className="w-10 h-10 rounded-full story-ring p-[2px] transition-transform group-hover:scale-105">
            <div className="w-full h-full rounded-full bg-vibe-surface border border-vibe-border overflow-hidden">
              <img 
                src={authorAvatar || `https://ui-avatars.com/api/?name=${authorUsername}&background=random`} 
                alt={authorUsername}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm text-vibe-text group-hover:text-vibe-purple transition-colors">
                {authorDisplayName}
              </p>
              {post.author_is_verified && (
                <span className="text-[10px] bg-vibe-cyan/20 text-vibe-cyan px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">V</span>
              )}
            </div>
            <p className="text-[10px] text-vibe-text-secondary uppercase tracking-widest font-bold opacity-60">
              {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
        </Link>
        <button 
          className="p-2 text-vibe-text-secondary hover:text-vibe-text tap-bounce"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <span className="text-xl">⋯</span>
        </button>
      </div>

      {/* Main Media Content */}
      <div 
        className="relative aspect-square bg-vibe-dark/40 overflow-hidden cursor-pointer select-none"
        onDoubleClick={() => handleLike()}
      >
        <img 
          src={post.url} 
          alt={post.caption || ''}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Double Tap Heart Overlay */}
        <AnimatePresence>
          {heartAnimation && (
            <motion.div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1.2 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4 }}
            >
              <span className="text-7xl drop-shadow-2xl">❤️</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLike}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all tap-bounce",
              localIsLiked ? "bg-red-500/20 text-red-500" : "bg-white/5 text-vibe-text-secondary hover:bg-white/10"
            )}
          >
            <motion.span 
              className="text-lg"
              animate={{ scale: localIsLiked ? [1, 1.4, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              {localIsLiked ? '❤️' : '🤍'}
            </motion.span>
            <span className="text-xs font-black">{localLikeCount}</span>
          </button>
          
          <button 
            onClick={() => onComment(post.id)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-vibe-text-secondary hover:bg-white/10 transition-all tap-bounce"
          >
            <span className="text-lg">💬</span>
            <span className="text-xs font-black">{post.comment_count || 0}</span>
          </button>
        </div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onSave(post.id); }}
          className={cn(
            "p-2 rounded-full transition-all tap-bounce",
            isSaved ? "text-vibe-purple" : "bg-white/5 text-vibe-text-secondary hover:text-vibe-purple"
          )}
        >
          <span className="text-lg">{isSaved ? '🔖' : '🔖'}</span>
        </button>
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-4 pb-4">
          <p className="text-sm text-vibe-text leading-relaxed">
            <span className="font-bold mr-2">{authorUsername}</span>
            {post.caption}
          </p>
        </div>
      )}

      <ShareModal 
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        entityId={post.id}
        entityType="post"
        title={post.caption}
      />
    </Card>
  );
});

FeedPostCard.displayName = 'FeedPostCard';
export default FeedPostCard;
