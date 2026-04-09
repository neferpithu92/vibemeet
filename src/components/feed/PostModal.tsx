'use client';

import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    media_url: string;
    media_type?: 'photo' | 'video';
    caption?: string;
    likes_count?: number;
    profiles?: any;
    location_name?: string;
  } | null;
}

export default function PostModal({ isOpen, onClose, post }: PostModalProps) {
  const t = useTranslations('feed');
  if (!post) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dettaglio Post" size="xl">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Media Column */}
        <div className="flex-1 aspect-square md:aspect-auto md:h-[600px] bg-black rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative">
          {post.media_type === 'video' || post.media_url.includes('mp4') || post.media_url.includes('webm') ? (
            <video 
              src={post.media_url} 
              className="w-full h-full object-contain" 
              controls 
              autoPlay 
              loop
            />
          ) : (
            <img 
              src={post.media_url} 
              alt="Post" 
              className="w-full h-full object-contain" 
            />
          )}
        </div>

        {/* Info Column */}
        <div className="w-full md:w-80 flex flex-col h-full space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar size="md" src={post.profiles?.avatar_url} fallback={post.profiles?.username || 'U'} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight">{post.profiles?.display_name || post.profiles?.username}</span>
                  <Badge variant="verified">✓</Badge>
                </div>
                <p className="text-[11px] text-vibe-text-secondary uppercase tracking-widest font-bold">
                   {post.location_name || 'Live Now'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="p-1 h-auto">
              <MoreHorizontal className="w-5 h-5 text-vibe-text-secondary" />
            </Button>
          </div>

          <div className="flex-1 py-4 border-y border-white/5 overflow-y-auto max-h-[300px]">
            <p className="text-sm text-vibe-text leading-relaxed">
              <span className="font-bold mr-2">@{post.profiles?.username}</span>
              {post.caption || t('noCaption')}
            </p>
            <div className="mt-4 pt-4">
               {/* Comments would go here */}
               <p className="text-xs text-vibe-text-secondary italic">I commenti verranno presto abilitati...</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button className="text-vibe-text-secondary hover:text-vibe-pink transition-colors">
                  <Heart className="w-6 h-6" />
                </button>
                <button className="text-vibe-text-secondary hover:text-vibe-cyan transition-colors">
                  <MessageCircle className="w-6 h-6" />
                </button>
                <button className="text-vibe-text-secondary hover:text-white transition-colors">
                  <Share2 className="w-6 h-6" />
                </button>
              </div>
              <button className="text-vibe-text-secondary hover:text-vibe-purple transition-colors">
                <Bookmark className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-1">
              <p className="font-bold text-sm">{post.likes_count || 0} Like</p>
              <p className="text-[10px] text-vibe-text-secondary uppercase font-bold tracking-widest">
                {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="relative">
               <input 
                 type="text" 
                 placeholder={t('writeComment')}
                 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-vibe-purple/50 transition-all"
               />
               <button className="absolute right-4 top-1/2 -translate-y-1/2 text-vibe-purple font-bold text-xs uppercase hover:text-white transition-colors">
                 {t('publish')}
               </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
