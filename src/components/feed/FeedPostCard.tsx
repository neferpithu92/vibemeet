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
    } | {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }[];
    like_count?: number;
    view_count?: number;
  };
  isLiked?: boolean;
  isSaved?: boolean;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onComment: (id: string) => void;
}

const FeedPostCard = memo(({ post, isLiked, isSaved, onLike, onSave, onComment }: FeedPostCardProps) => {
  const t = useTranslations('feed');
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;

  const handleLike = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onLike(post.id);
    
    if (!isLiked) {
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 800);
    }
  };

  const handleDoubleTap = () => {
    handleLike();
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave(post.id);
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComment(post.id);
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
                author_id: (profile as any)?.id || post.id,
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
  }, [inView, hasTrackedView, post.id, profile]);

  return (
    <Card ref={viewRef} className="overflow-hidden bg-vibe-dark/40 border-white/5 shadow-2xl rounded-[2rem] gpu-accelerated mb-6">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar 
            size="md" 
            src={profile?.avatar_url} 
            fallback={profile?.username?.[0] || 'U'} 
            hasStory={true}
            className="gpu-accelerated"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight">{profile?.display_name || profile?.username}</span>
              <Badge variant="verified" className="scale-75 origin-left">✓</Badge>
            </div>
            <p className="text-[10px] text-vibe-text-secondary uppercase font-black tracking-widest opacity-60">
               {profile?.username}
            </p>
          </div>
        </div>
        <button className="p-3 text-vibe-text-secondary hover:text-white transition-all interactive-hover rounded-2xl active:scale-90">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div 
        className="relative aspect-square bg-black flex items-center justify-center overflow-hidden cursor-pointer gpu-accelerated group"
        onDoubleClick={handleDoubleTap}
      >
        {showHeartAnimation && (
          <div className="absolute z-10 pointer-events-none animate-scale-heart">
            <Heart className="w-28 h-28 text-white fill-white drop-shadow-[0_0_30px_rgba(236,72,153,0.9)]" />
          </div>
        )}

        {post.type === 'video' || post.type === 'reel' ? (
          <video 
            src={post.url} 
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            autoPlay
          />
        ) : (
          <Image 
            src={post.url} 
            alt="Content" 
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            priority={false}
          />
        )}
      </div>

      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={handleLike}
              className={`tap-scale active:scale-125 transition-transform ${isLiked ? 'text-vibe-pink' : 'text-vibe-text-secondary hover:text-white'}`}
            >
              <Heart className={`w-7 h-7 ${isLiked ? 'fill-vibe-pink' : ''}`} />
            </button>
            <button 
              onClick={handleComment}
              className="text-vibe-text-secondary hover:text-vibe-cyan tap-scale active:scale-125 transition-transform"
            >
              <MessageCircle className="w-7 h-7" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsShareOpen(true); }}
              className="text-vibe-text-secondary hover:text-vibe-purple tap-scale active:scale-125 transition-transform"
            >
              <Share2 className="w-7 h-7" />
            </button>
          </div>
          <button 
            onClick={handleSave}
            className={`tap-scale active:scale-125 transition-transform ${isSaved ? 'text-vibe-purple' : 'text-vibe-text-secondary hover:text-white'}`}
          >
            <Bookmark className={`w-7 h-7 ${isSaved ? 'fill-vibe-purple' : ''}`} />
          </button>
        </div>

        <div className="space-y-2">
          <p className="font-black text-sm uppercase tracking-widest">
            {post.like_count || 0} Likes
          </p>
          
          <div className="text-sm leading-relaxed">
            <span className="font-black mr-2 uppercase tracking-tighter vibe-gradient-text">@{profile?.username}</span>
            <span className="text-vibe-text/90 font-medium">{post.caption}</span>
          </div>

          <div className="flex items-center gap-4 pt-1">
            {(post.view_count ?? 0) > 0 && (
              <p className="text-[10px] text-vibe-text-secondary font-black uppercase tracking-widest opacity-60">
                {post.view_count?.toLocaleString()} Views
              </p>
            )}
            <button 
              onClick={() => onComment(post.id)}
              className="text-[10px] text-vibe-purple font-black uppercase tracking-widest hover:underline transition-all"
            >
              {t('addComment')}
            </button>
          </div>

          <p className="text-[9px] text-vibe-text-secondary uppercase font-black tracking-[0.2em] pt-2 opacity-40">
             {new Date(post.created_at).toLocaleDateString()}
          </p>
        </div>
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
