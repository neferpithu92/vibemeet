'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface Comment {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author?: {
    username: string;
    avatar_url: string;
    display_name: string;
  };
}

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityType?: 'media' | 'event';
}

const dateLocales: Record<string, any> = { it, en: enUS };

export default function CommentsDrawer({ isOpen, onClose, entityId, entityType = 'media' }: CommentsDrawerProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const supabase = createClient();
  const t = useTranslations('social');
  const locale = useLocale();

  const fetchComments = useCallback(async () => {
    if (!entityId) return;
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:users(username, avatar_url, display_name)
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setComments(data as any[]);
    }
    setIsLoading(false);
  }, [entityId, entityType, supabase]);

  useEffect(() => {
    if (!isOpen) return;

    fetchComments();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    // Realtime subscription
    const channel = supabase
      .channel(`comments:${entityId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'comments',
        filter: `entity_id=eq.${entityId}`
      }, () => {
        fetchComments(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, entityId, fetchComments, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    const content = newComment.trim();
    setNewComment('');

    const { error } = await supabase
      .from('comments')
      .insert({
        author_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        body: content
      });

    if (error) {
      console.error("Errore nell'invio del commento:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[120] h-[70vh] bg-vibe-dark rounded-t-3xl border-t border-white/10 flex flex-col"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100) onClose();
            }}
          >
            <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-2 border-b border-white/10">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mb-3" />
              <div className="flex items-center justify-between w-full px-4">
                <h3 className="font-display font-bold text-white text-lg">
                  {t('comments')} <span className="text-vibe-text-secondary text-sm ml-1">{comments.length}</span>
                </h3>
                <button onClick={onClose} className="p-2 rounded-full bg-white/5 active:scale-90 transition-transform">
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
              {isLoading && comments.length === 0 ? (
                <div className="flex justify-center py-20">
                  <div className="w-8 h-8 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-20 text-vibe-text-secondary italic text-sm">
                   Non ci sono ancora commenti. Sii il primo!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 items-start">
                    <Avatar size="sm" src={comment.author?.avatar_url} fallback={comment.author?.username?.[0] || '?'} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white/90">
                          @{comment.author?.username || 'Anonimo'}
                        </span>
                        <span className="text-[10px] text-white/40">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: dateLocales[locale] || it })}
                        </span>
                      </div>
                      <p className="text-sm text-white/80 mt-1 leading-relaxed">{comment.body}</p>
                    </div>
                    <button className="pt-2">
                       <Heart className="w-4 h-4 text-white/20 hover:text-vibe-pink transition-colors" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex-shrink-0 p-4 border-t border-white/10 bg-vibe-dark/95 pb-[env(safe-area-inset-bottom)]">
              {user ? (
                <form onSubmit={handleSubmit} className="flex items-center gap-3">
                  <Avatar size="sm" src={user.user_metadata?.avatar_url} fallback={user.email?.[0] || 'U'} />
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Commenta questo Reel..."
                      className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-4 pr-12 text-sm text-white placeholder-white/30 focus:outline-none focus:border-vibe-purple transition-colors"
                    />
                    <button 
                      type="submit"
                      disabled={!newComment.trim()}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-full bg-vibe-gradient text-white disabled:opacity-30 transition-opacity"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center text-xs text-vibe-text-secondary py-2">
                  Accedi per lasciare un commento.
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

