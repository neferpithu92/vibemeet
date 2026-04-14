'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/ToastProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { it, enUS, de, fr } from 'date-fns/locale';
import { Link } from '@/lib/i18n/navigation';

interface Comment {
  id: string;
  author_id: string;
  entity_type: string;
  entity_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  author?: {
    username: string;
    avatar_url: string | null;
    display_name: string | null;
  };
  replies?: Comment[];
}

interface CommentThreadProps {
  entityType: 'event' | 'venue' | 'media';
  entityId: string;
}

const dateLocales: Record<string, any> = { it, en: enUS, de, fr };

export default function CommentThread({ entityType, entityId }: CommentThreadProps) {
  const t = useTranslations('social');
  const locale = useLocale();
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await (supabase
      .from('comments') as any)
      .select(`
        *,
        author:users(username, avatar_url, display_name)
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true });

    if (error) {
       console.error('Error fetching comments:', error);
       showToast(t('errorLoading'), 'error');
    } else {
      // Build tree structure
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      (data as Comment[])?.forEach(comment => {
        comment.replies = [];
        commentMap.set(comment.id, comment);
      });

      (data as Comment[])?.forEach(comment => {
        if (comment.parent_id && commentMap.has(comment.parent_id)) {
          commentMap.get(comment.parent_id)?.replies?.push(comment);
        } else {
          rootComments.push(comment);
        }
      });

      setComments(rootComments);
    }
    setIsLoading(false);
  }, [entityId, entityType, supabase, t, showToast]);

  useEffect(() => {
    fetchComments();

    // Re-check user
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    // Realtime subscription
    const channel = (supabase as any)
      .channel(`comments:${entityId}`)
      .on('postgres_changes' as any, { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'comments',
        filter: `entity_id=eq.${entityId}`
      }, () => {
        fetchComments(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(console.error);
    };
  }, [entityId, fetchComments, supabase]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;

    setIsPosting(true);
    try {
      const { error } = await (supabase
        .from('comments') as any)
        .insert({
          author_id: (user as any).id,
          entity_type: entityType,
          entity_id: entityId,
          body: newComment,
          parent_id: replyTo?.id || null
        });

      if (error) throw error;
      
      showToast(t('postSuccess'), 'success', '💬');
      setNewComment('');
      setReplyTo(null);
    } catch (e: any) {
      console.error('Error posting comment:', e);
      showToast(e.message || t('errorPosting'), 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => {
    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-3 ${isReply ? 'ml-8 mt-4' : 'mt-6 border-b border-white/5 pb-6'}`}
      >
        <Avatar 
          src={comment.author?.avatar_url || ''} 
          fallback={comment.author?.username?.[0] || '?'} 
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">
              {comment.author?.display_name || comment.author?.username || t('anonymousUser')}
            </span>
            <span className="text-[10px] text-vibe-text-secondary uppercase tracking-tight">
              {formatDistanceToNow(new Date(comment.created_at), { 
                addSuffix: true, 
                locale: dateLocales[locale] || it 
              })}
            </span>
          </div>
          <p className="text-sm text-vibe-text-primary leading-relaxed break-words">
            {comment.body}
          </p>
          
          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={() => {
                setReplyTo(comment);
                // Scroll to input?
                document.getElementById('comment-input')?.focus();
              }}
              className="text-xs font-bold text-vibe-purple hover:text-vibe-pink transition-colors"
            >
              {t('reply')}
            </button>
            {/* Future: Like button for comment */}
          </div>

          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-4">
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h3 className="text-lg font-bold vibe-gradient-text mb-6">
          {t('comments')} ({comments.length + comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0)})
        </h3>

        {user ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
            {replyTo && (
              <div className="flex items-center justify-between mb-2 px-2 py-1 bg-vibe-purple/10 rounded-lg">
                <p className="text-xs text-vibe-purple">
                  {t('replyingTo')} <span className="font-bold">@{replyTo.author?.username}</span>
                </p>
                <button onClick={() => setReplyTo(null)} className="text-vibe-text-secondary hover:text-white">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <textarea
              id="comment-input"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('writeComment')}
              className="w-full bg-transparent border-none focus:ring-0 text-sm min-h-[80px] resize-none placeholder:text-vibe-text-secondary placeholder:opacity-50"
            />
            <div className="flex justify-end mt-2 pt-2 border-t border-white/5">
              <Button 
                size="sm" 
                onClick={handlePostComment}
                disabled={isPosting || !newComment.trim()}
              >
                {isPosting ? t('loading') : t('post')}
              </Button>
            </div>
          </div>
        ) : (
          <Card className="p-6 text-center border-dashed border-vibe-purple/20">
             <p className="text-sm text-vibe-text-secondary mb-3">
               {t('loginToComment')}
             </p>
             <Link href="/login">
               <Button variant="secondary" size="sm">{t('login')}</Button>
             </Link>
          </Card>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-vibe-purple border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {comments.map(comment => renderComment(comment))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-12 px-6 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-vibe-text-secondary text-sm italic">{t('noComments')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
