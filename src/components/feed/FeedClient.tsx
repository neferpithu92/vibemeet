'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import FeedPostCard from './FeedPostCard';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { PostSkeleton } from './FeedSkeleton';
import { cn } from '@/lib/utils';
import { Bell, MessageCircle, Plus, RefreshCw } from 'lucide-react';
import { useNotificationStore } from '@/stores/useNotificationStore';

// Lazy load heavy modals
const CreateStory = dynamic(() => import('./CreateStory'), { ssr: false });
const StoryViewer = dynamic(() => import('./StoryViewer'), { ssr: false });
const CommentsDrawer = dynamic(() => import('./CommentsDrawer'), { ssr: false });

interface FeedProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface FeedPost {
  id: string;
  url: string;
  type: string;
  caption?: string;
  created_at: string;
  author_username?: string;
  author_display_name?: string | null;
  author_avatar?: string | null;
  author_is_verified?: boolean;
  like_count?: number;
  comment_count?: number;
  view_count?: number;
  profiles?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface FeedStory {
  id: string;
  media_url: string | null;
  type: string;
  profiles?: FeedProfile | FeedProfile[];
}

interface FeedClientProps {
  initialPosts: FeedPost[];
  stories: FeedStory[];
}

export default function FeedClient({ initialPosts, stories }: FeedClientProps) {
  const t = useTranslations('feed');
  const { showToast } = useToast();
  const supabase = createClient();
  
  const [activeTab, setActiveTab] = useState<'perTe' | 'seguiti'>('perTe');
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [initialUserIndex, setInitialUserIndex] = useState(0);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [currentOffset, setCurrentOffset] = useState(initialPosts.length);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length >= 10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

  const { unreadCount } = useNotificationStore();

  const { targetRef, isIntersecting } = useIntersectionObserver({
    rootMargin: '800px',
  });

  // Carica i like iniziali dell'utente
  useEffect(() => {
    const loadUserLikes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || posts.length === 0) return;
      
      const postIds = posts.map(p => p.id);
      const { data: likes } = await (supabase.from('likes') as any)
        .select('entity_id')
        .eq('user_id', user.id)
        .eq('entity_type', 'media')
        .in('entity_id', postIds);
      
      if (likes) {
        setLikedPosts(new Set(likes.map((l: any) => l.entity_id)));
      }
    };
    loadUserLikes();
  }, []);

  // Normalizza posts per avere author_* fields
  const normalizedPosts = useMemo(() => {
    return posts.map(post => {
      const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
      return {
        ...post,
        author_username: post.author_username || profile?.username || 'unknown',
        author_display_name: post.author_display_name || profile?.display_name,
        author_avatar: post.author_avatar || profile?.avatar_url,
      };
    });
  }, [posts]);

  // Group stories by user
  const userStoryGroups = useMemo(() => {
    const groups: Record<string, any> = {};
    stories.forEach(story => {
      const profile = Array.isArray(story.profiles) ? story.profiles[0] : story.profiles;
      const userId = profile?.id || 'unknown';
      if (!groups[userId]) {
        groups[userId] = {
          id: userId,
          username: profile?.username || 'user',
          avatar_url: profile?.avatar_url,
          stories: []
        };
      }
      groups[userId].stories.push({
        id: story.id,
        media_url: story.media_url,
        type: story.type || 'photo'
      });
    });
    return Object.values(groups);
  }, [stories]);

  const handleStoryClick = (index: number) => {
    setInitialUserIndex(index);
    setIsViewerOpen(true);
  };

  const fetchMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch(`/api/feed/foryou?limit=10&offset=${currentOffset}`);
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = data.items.filter((p: FeedPost) => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
        setCurrentOffset(prev => prev + data.items.length);
        setHasMore(!!data.nextCursor);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('[Feed] Load more error:', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, currentOffset]);

  // Refresh feed
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/feed/foryou?limit=10&offset=0');
      if (!response.ok) return;
      const data = await response.json();
      if (data.items) {
        setPosts(data.items);
        setCurrentOffset(data.items.length);
        setHasMore(!!data.nextCursor);
      }
    } catch (e) {
      console.error('[Feed] Refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isIntersecting && hasMore) fetchMorePosts();
  }, [isIntersecting, hasMore, fetchMorePosts]);

  // Realtime: aggiorna feed con nuovi post
  useEffect(() => {
    const channel = supabase
      .channel('public-feed-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'media', filter: 'visibility=eq.public' },
        async (payload) => {
          // Fetch il nuovo post con il profilo
          const { data: newPost } = await (supabase.from('media') as any)
            .select(`
              id,
              media_url,
              media_type,
              caption,
              created_at,
              like_count,
              view_count,
              profiles:users!user_id(id, username, display_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();
          
          if (newPost) {
            const profile = Array.isArray(newPost.profiles) ? newPost.profiles[0] : newPost.profiles;
            setPosts(prev => [{
              ...newPost,
              url: newPost.media_url,
              type: newPost.media_type,
              author_username: profile?.username,
              author_display_name: profile?.display_name,
              author_avatar: profile?.avatar_url,
            }, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLike = useCallback(async (postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      prev.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }, []);

  const handleSave = useCallback(async (postId: string) => {
    setSavedPosts(prev => {
      const next = new Set(prev);
      prev.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
    // Persist save in DB
    const action = savedPosts.has(postId) ? 'unsave' : 'save';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (action === 'save') {
        await (supabase.from('saved_posts') as any).upsert({ user_id: user.id, post_id: postId }, { onConflict: 'user_id,post_id' });
      } else {
        await (supabase.from('saved_posts') as any).delete().match({ user_id: user.id, post_id: postId });
      }
    } catch (e) {
      console.error('[Feed] Save error:', e);
    }
  }, [savedPosts]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 mb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sticky top-0 z-20 bg-vibe-dark/95 backdrop-blur-xl -mx-4 px-4 py-2 border-b border-white/5">
        <h1 className="font-display text-2xl font-black vibe-gradient-text tracking-tighter">VIBEMEET</h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            className={cn("p-2.5 bg-white/5 hover:bg-vibe-purple/10 rounded-2xl transition-all tap-bounce border border-white/5", isRefreshing && "animate-spin")}
            disabled={isRefreshing}
          >
            <RefreshCw className="w-4 h-4 text-vibe-text-secondary" />
          </button>
        </div>
      </div>

      {/* Story Bar */}
      <div className="flex gap-4 mb-8 overflow-x-auto hide-scrollbar pb-2">
        <button 
          onClick={() => setIsCreateStoryOpen(true)}
          className="flex flex-col items-center gap-2 min-w-fit group tap-scale"
        >
          <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-vibe-purple via-vibe-pink to-vibe-cyan transition-all">
            <div className="bg-vibe-dark rounded-full p-[2px]">
              <Avatar size="lg" fallback={t('yourStoryFallback') || 'Tu'} />
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-vibe-purple flex items-center justify-center text-white border-[3px] border-vibe-dark shadow-xl">
              <Plus className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-[11px] font-bold text-vibe-text-secondary">{t('yourStory')}</span>
        </button>
        
        {userStoryGroups.map((group, index) => (
          <button 
            key={group.id} 
            onClick={() => handleStoryClick(index)}
            className="flex flex-col items-center gap-2 min-w-fit group tap-scale"
          >
            <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-vibe-purple to-vibe-pink transition-all">
              <div className="bg-vibe-dark rounded-full p-[2px]">
                <Avatar
                  size="lg"
                  src={group.avatar_url}
                  fallback={group.username[0]}
                />
              </div>
            </div>
            <span className="text-[11px] font-bold text-vibe-text-secondary truncate max-w-[72px]">
              {group.username}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-white/5 mb-8">
        {([['perTe', t('forYou')], ['seguiti', t('following')]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 pb-3 text-sm font-bold transition-all relative ${
              activeTab === key ? 'text-white' : 'text-vibe-text-secondary hover:text-white'
            }`}
          >
            {label}
            {activeTab === key && (
              <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-vibe-purple transition-all duration-300" />
            )}
          </button>
        ))}
      </div>

      {/* Post Feed */}
      <div className="space-y-8">
        <AnimatePresence initial={false}>
          {normalizedPosts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
            >
              <FeedPostCard 
                post={post as any}
                isLiked={likedPosts.has(post.id)}
                isSaved={savedPosts.has(post.id)}
                onLike={handleLike}
                onSave={handleSave}
                onComment={(id) => setCommentsPostId(id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={targetRef} className="py-8">
          {isLoadingMore && (
            <div className="space-y-8">
              <PostSkeleton />
              <PostSkeleton />
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <p className="text-center text-vibe-text-secondary text-xs uppercase tracking-widest font-bold opacity-40 py-4">
              🎉 Hai visto tutto!
            </p>
          )}
        </div>
      </div>

      {/* Modals & Overlays */}
      {isViewerOpen && (
        <StoryViewer 
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          userGroups={userStoryGroups}
          initialUserIndex={initialUserIndex}
        />
      )}

      {isCreateStoryOpen && (
        <CreateStory 
          isOpen={isCreateStoryOpen} 
          onClose={() => setIsCreateStoryOpen(false)} 
          onSuccess={() => {
            showToast("Storia pubblicata con successo!", "success");
            setIsCreateStoryOpen(false);
          }}
        />
      )}

      {commentsPostId && (
        <CommentsDrawer
          isOpen={!!commentsPostId}
          onClose={() => setCommentsPostId(null)}
          postId={commentsPostId}
        />
      )}
    </div>
  );
}
