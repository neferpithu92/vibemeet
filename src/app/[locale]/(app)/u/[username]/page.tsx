'use client';

import { useParams } from 'next/navigation';
import { useRouter } from '@/lib/i18n/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { motion } from 'framer-motion';
import { Camera, Video, Ghost, Lock, MoreHorizontal, Share, MessageCircle } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/ToastProvider';

interface UserProfileData {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  account_type: string;
  follower_count?: number;
  following_count?: number;
  post_count?: number;
}

interface MediaPost {
  id: string;
  media_url: string;
  thumbnail_url: string | null;
  media_type: string;
  like_count: number;
  created_at: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;
  const supabase = createClient();
  
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [reels, setReels] = useState<MediaPost[]>([]);
  const [highlights, setHighlights] = useState<MediaPost[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [canViewContent, setCanViewContent] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'tagged'>('posts');
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const t = useTranslations('profile');
  const { showToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const { api } = await import('@/hooks/useApi');
        const data = await api.profile.get(username);
        
        if (data && data.profile) {
          const p = data.profile;
          setProfile(p);
          setFollowerCount(p.follower_count || 0);
          setFollowingCount(p.following_count || 0);
          setPostCount(p.post_count || 0);
          setIsFollowing(data.is_following);
          setCanViewContent(data.can_view_content);
          setIsPrivate(p.account_type === 'private');
          
          const { data: { user } } = await supabase.auth.getUser();
          setIsOwnProfile(user?.id === p.id);

          if (data.media) {
            setPosts(data.media.filter(m => m.type === 'photo' || m.type === 'image'));
            setReels(data.media.filter(m => m.type === 'video' || m.type === 'reel'));
            setHighlights(data.media.filter(m => m.type === 'story' && m.is_featured));
          }
        }
      } catch (err) {
        console.error('[Public Profile] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [username]);

  const handleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profile) return;

    if (isFollowing) {
      await (supabase as any).from('followers').delete().match({
        follower_id: user.id,
        following_id: profile.id,
        entity_type: 'user'
      });
      if (isPrivate) {
        await (supabase as any).from('friendships').delete().match({
          requester_id: user.id,
          addressee_id: profile.id
        });
      }
      setIsFollowing(false);
      setFollowerCount(prev => prev - 1);
    } else {
      await (supabase as any).from('followers').insert({
        follower_id: user.id,
        following_id: profile.id,
        entity_type: 'user'
      });
      if (isPrivate) {
        await (supabase as any).from('friendships').insert({
          requester_id: user.id,
          addressee_id: profile.id,
          status: 'pending'
        });
      }
      setIsFollowing(true);
      setFollowerCount(prev => prev + 1);
    }
  };

  if (loading) return (
    <div className="min-h-screen pt-16 px-4 max-w-2xl mx-auto">
      <div className="animate-pulse space-y-4 pt-8">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-white/10 rounded w-32" />
            <div className="h-4 bg-white/10 rounded w-24" />
          </div>
        </div>
        <div className="h-4 bg-white/10 rounded w-full" />
        <div className="grid grid-cols-3 gap-1">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="aspect-square bg-white/10 rounded" />
          ))}
        </div>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-6">
      <div className="w-24 h-24 rounded-[2rem] bg-vibe-gradient rotate-12 flex items-center justify-center shadow-2xl animate-float">
        <Ghost className="w-12 h-12 text-white -rotate-12" />
      </div>
      <h2 className="text-2xl font-display font-black vibe-gradient-text uppercase tracking-tighter">{t('userNotFound')}</h2>
      <BackButton />
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-vibe-dark/80 
                      backdrop-blur-xl border-b border-white/5 
                      px-4 py-3 flex items-center gap-3">
        <h1 className="font-display font-black text-lg flex-1 uppercase tracking-tighter">
          @{profile.username}
        </h1>
        <button className="p-2 rounded-xl hover:bg-white/10 transition-all tap-bounce">
          <MoreHorizontal className="w-5 h-5 text-vibe-text-secondary" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Profile Info */}
        <div className="pt-6 pb-4">
          <div className="flex items-start gap-6 mb-4">
            {/* Avatar */}
            <div className="story-ring p-[2px] rounded-full">
              <Avatar
                src={profile.avatar_url}
                fallback={profile.display_name?.[0] 
                  || profile.username[0]}
                size="xl"
                className="border-2 border-vibe-dark"
              />
            </div>

            {/* Stats */}
            <div className="flex-1">
              <div className="flex gap-4 mb-4">
                <div className="text-center">
                  <p className="font-bold text-lg">{postCount}</p>
                  <p className="text-xs text-vibe-text-secondary">
                    Post
                  </p>
                </div>
                <div className="text-center cursor-pointer group tap-bounce">
                  <p className="font-black text-lg group-hover:text-vibe-purple transition-colors">{followerCount}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-vibe-text-secondary opacity-60">
                    {t('followers')}
                  </p>
                </div>
                <div className="text-center cursor-pointer group tap-bounce">
                  <p className="font-black text-lg group-hover:text-vibe-purple transition-colors">{followingCount}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-vibe-text-secondary opacity-60">
                    {t('following')}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              {isOwnProfile ? (
                <div className="flex gap-2">
                  <Link href="/settings" className="flex-1">
                    <Button variant="secondary" 
                            className="w-full text-xs py-2">
                      Modifica profilo
                    </Button>
                  </Link>
                  <Button variant="secondary" size="xs" className="py-2">
                    📤
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant={isFollowing ? 'secondary' : 'primary'}
                    className="flex-1 text-sm py-2"
                    onClick={handleFollow}
                  >
                    {isFollowing ? t('followingStatus') : t('followAction')}
                  </Button>
                  <Link href={`/chat?u=${profile.id}`} className="flex-1">
                    <Button variant="secondary" className="w-full text-sm py-2 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-vibe-purple/10 transition-all flex items-center justify-center gap-2">
                      <MessageCircle className="w-4 h-4" /> {t('message')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm">
                {profile.display_name || profile.username}
              </p>
              {profile.is_verified && (
                <Badge variant="verified">✓</Badge>
              )}
            </div>
            {profile.bio && (
              <p className="text-sm text-vibe-text leading-relaxed">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Highlights Section */}
        {canViewContent && highlights.length > 0 && (
          <div className="mb-6 w-full overflow-x-auto hide-scrollbar">
            <div className="flex gap-4 min-w-max px-2">
              {highlights.map((h, i) => (
                <div key={h.id || i} className="flex flex-col items-center gap-1 cursor-pointer tap-bounce">
                  <div className="w-16 h-16 rounded-full border border-white/20 overflow-hidden flex items-center justify-center p-[2px]">
                     <div className="w-full h-full rounded-full overflow-hidden bg-vibe-dark">
                        <img src={h.thumbnail_url || h.media_url || '/placeholder.png'} className="w-full h-full object-cover" alt="highlight" />
                     </div>
                  </div>
                  <span className="text-[10px] font-bold mt-1 text-white/90">{`High ${i+1}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Private account check */}
        {!canViewContent ? (
          <EmptyState
            icon={Lock}
            title={t('privateAccount')}
            description={t('privateDescription')}
            actionLabel={isFollowing ? t('requestSent') : t('followAction')}
            onAction={handleFollow}
          />
        ) : (
          <>
            {/* Content tabs */}
            <div className="border-t border-white/10">
              <div className="flex">
                {[
                  { key: 'posts', icon: '⊞', label: 'Post' },
                  { key: 'reels', icon: '▶', label: 'Reels' },
                  { key: 'tagged', icon: '🏷', label: 'Tag' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => 
                      setActiveTab(tab.key as typeof activeTab)}
                    className={`flex-1 py-3 flex flex-col 
                                items-center gap-1 border-b-2 
                                transition-colors ${
                      activeTab === tab.key
                        ? 'border-vibe-purple text-vibe-purple'
                        : 'border-transparent text-vibe-text-secondary'
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span className="text-[10px] font-medium">
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-3 gap-0.5 mt-0.5">
              {(activeTab === 'posts' ? posts : 
                activeTab === 'reels' ? reels : [])
                .map(post => (
                <div key={post.id}
                     className="relative aspect-square 
                                bg-white/5 overflow-hidden group">
                  {post.media_type === 'video' || post.media_type === 'reel' ? (
                    <>
                      <video
                        src={post.media_url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <div className="absolute top-2 right-2">
                        <span className="text-white text-sm 
                                         drop-shadow">▶</span>
                      </div>
                    </>
                  ) : (
                    <img
                      src={post.thumbnail_url || post.media_url}
                      alt=""
                      className="w-full h-full object-cover 
                                 transition-transform duration-300 
                                 group-hover:scale-105"
                    />
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 
                                  opacity-0 group-hover:opacity-100 
                                  transition-opacity flex items-center 
                                  justify-center gap-4">
                    <span className="text-white text-sm font-bold">
                      ❤️ {post.like_count}
                    </span>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {activeTab === 'posts' && posts.length === 0 && (
                <div className="col-span-3">
                  <EmptyState 
                    icon={Camera}
                    title="Nessun post ancora"
                    description={isOwnProfile 
                      ? 'Inizia a condividere le tue esperienze'
                      : 'Questo utente non ha ancora pubblicato nulla'}
                    actionLabel={isOwnProfile ? 'Crea il primo post' : undefined}
                    onAction={isOwnProfile ? () => router.push('/create') : undefined}
                  />
                </div>
              )}

              {activeTab === 'reels' && reels.length === 0 && (
                <div className="col-span-3">
                  <EmptyState 
                    icon={Video}
                    title="Nessun Vibe ancora"
                    description={isOwnProfile
                      ? 'Registra il tuo primo Vibe'
                      : 'Nessun video pubblicato'}
                    actionLabel={isOwnProfile ? 'Crea un Vibe' : undefined}
                    onAction={isOwnProfile ? () => router.push('/create') : undefined}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
