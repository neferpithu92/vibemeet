'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedPostCardProps {
  post: {
    id: string;
    url: string;
    type: string;
    caption?: string;
    created_at: string;
    profiles?: any;
    likes_count?: number;
    comments_count?: number;
  };
  isLiked?: boolean;
  isSaved?: boolean;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onComment: (id: string) => void;
}

export default function FeedPostCard({ post, isLiked, isSaved, onLike, onSave, onComment }: FeedPostCardProps) {
  const t = useTranslations('feed');
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);

  const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;

  const handleDoubleTap = () => {
    if (!isLiked) {
      onLike(post.id);
    }
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 800);
  };

  return (
    <Card className="overflow-hidden bg-vibe-dark/40 border-white/5 shadow-2xl backdrop-blur-sm rounded-3xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar 
            size="md" 
            src={profile?.avatar_url} 
            fallback={profile?.username?.[0] || 'U'} 
            hasStory={true}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight">{profile?.display_name || profile?.username}</span>
              <Badge variant="verified" className="scale-75 origin-left">✓</Badge>
            </div>
            <p className="text-[10px] text-vibe-text-secondary uppercase font-bold tracking-widest">
               {profile?.username} · 2h
            </p>
          </div>
        </div>
        <button className="p-2 text-vibe-text-secondary hover:text-white transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Media Content */}
      <div 
        className="relative aspect-square bg-black flex items-center justify-center overflow-hidden cursor-pointer"
        onDoubleClick={handleDoubleTap}
      >
        <AnimatePresence>
          {showHeartAnimation && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute z-10 pointer-events-none"
            >
              <Heart className="w-24 h-24 text-white fill-white drop-shadow-[0_0_20px_rgba(236,72,153,0.8)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {post.type === 'video' ? (
          <video 
            src={post.url} 
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            autoPlay
          />
        ) : (
          <img 
            src={post.url} 
            alt="Content" 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
      </div>

      {/* Actions */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => onLike(post.id)}
              className={`transition-all active:scale-125 ${isLiked ? 'text-vibe-pink' : 'text-vibe-text-secondary hover:text-white'}`}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-vibe-pink' : ''}`} />
            </button>
            <button 
              onClick={() => onComment(post.id)}
              className="text-vibe-text-secondary hover:text-vibe-cyan transition-all active:scale-125"
            >
              <MessageCircle className="w-6 h-6" />
            </button>
            <button className="text-vibe-text-secondary hover:text-vibe-purple transition-all active:scale-125">
              <Share2 className="w-6 h-6" />
            </button>
          </div>
          <button 
            onClick={() => onSave(post.id)}
            className={`transition-all active:scale-125 ${isSaved ? 'text-vibe-purple' : 'text-vibe-text-secondary hover:text-white'}`}
          >
            <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-vibe-purple' : ''}`} />
          </button>
        </div>

        {/* Likes Count */}
        <div className="space-y-1">
          <p className="font-bold text-sm">{post.likes_count || 0} Like</p>
          
          {/* Caption */}
          <div className="text-sm leading-relaxed">
            <span className="font-extrabold mr-2">@{profile?.username}</span>
            <span className="text-vibe-text/90">{post.caption}</span>
          </div>

          {/* Comments Link */}
          {post.comments_count ? (
            <button 
              onClick={() => onComment(post.id)}
              className="text-xs text-vibe-text-secondary font-medium hover:text-vibe-purple transition-colors block mt-1"
            >
              Visualizza tutti i {post.comments_count} commenti
            </button>
          ) : (
            <button 
              onClick={() => onComment(post.id)}
              className="text-xs text-vibe-text-secondary font-medium hover:text-vibe-purple transition-colors block mt-1"
            >
              Aggiungi un commento...
            </button>
          )}

          {/* Time */}
          <p className="text-[9px] text-vibe-text-secondary uppercase font-bold tracking-widest pt-1">
            {new Date(post.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>
    </Card>
  );
}
