'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
import { ShareModal } from '@/components/social/ShareModal';
import Image from 'next/image';
import { useInView } from 'react-intersection-observer';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Link } from '@/lib/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion';

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

  const handleLike = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onLike(post.id);
  };

  const [hasTrackedView, setHasTrackedView] = useState(false);
  const { ref: viewRef, inView } = useInView({
    threshold: 0.7,
    triggerOnce: true
  });

  useEffect(() => {
    if (inView && !hasTrackedView) {
      setHasTrackedView(true);
      const trackView = async () => {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          
          await fetch('/api/social/batch-interactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              interactions: [{
                user_id: user.id,
                post_id: post.id,
                author_id: post.id,
                type: 'view',
                watch_time: 0,
                affinity_inc: 0.1
              }]
            })
          });
        } catch (err) {
          console.warn('[Feed] View tracking failed:', err);
        }
      };
      trackView();
    }
  }, [inView, hasTrackedView, post.id]);

  return (
    <Card 
      ref={viewRef} 
      onClick={onClick}
      className={cn(
        "overflow-hidden transition-all duration-500 hover:translate-y-[-4px]",
        shining ? 'vibe-shining-border' : (hover ? 'glass-card-hover' : 'glass-card')
      )}
    >
      {/* Header — Author Info */}
      <div className="flex items-center justify-between p-4">
        <Link href={`/u/${post.author_username}`} className="flex items-center gap-3 group tap-bounce">
          <div className="w-10 h-10 rounded-full story-ring p-[2px] transition-transform group-hover:scale-105">
            <div className="w-full h-full rounded-full bg-vibe-surface border border-vibe-border overflow-hidden">
              <img 
                src={post.author_avatar || `https://ui-avatars.com/api/?name=${post.author_username}&background=random`} 
                alt={post.author_username}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm text-vibe-text group-hover:text-vibe-purple transition-colors">
                {post.author_display_name || post.author_username}
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
        <button className="p-2 text-vibe-text-secondary hover:text-vibe-text tap-bounce">
          <span className="text-xl">⋯</span>
        </button>
      </div>

      {/* Main Media Content */}
      <div 
        className="relative aspect-square bg-vibe-dark/40 overflow-hidden cursor-pointer"
        onDoubleClick={() => !isLiked && handleLike()}
      >
        <div className="absolute inset-0 shimmer opacity-20" />
        <img 
          src={post.url} 
          alt={post.caption || ''}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
          loading="lazy"
        />
        
        {/* Double Tap Heart Overlay */}
        <AnimatePresence>
          {isLiked && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-6xl animate-pulse">❤️</span>
            </div>
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
              isLiked ? "bg-red-500/20 text-red-500" : "bg-white/5 text-vibe-text-secondary hover:bg-white/10"
            )}
          >
            <span className="text-lg">{isLiked ? '❤️' : '🤍'}</span>
            <span className="text-xs font-black">{(post.like_count || 0) + (isLiked ? 1 : 0)}</span>
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
          onClick={() => onSave(post.id)}
          className="p-2 bg-white/5 rounded-full text-vibe-text-secondary hover:text-vibe-purple tap-bounce"
        >
          <span className="text-lg">🔖</span>
        </button>
      </div>

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
