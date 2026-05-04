'use client';

import { useState, useEffect, memo, useMemo } from 'react';
import Image from 'next/image';
import { useRouter, usePathname, Link } from '@/lib/i18n/navigation';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { locales } from '@/lib/i18n/config';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { createClient } from '@/lib/supabase/client';
import { 
  Share2, 
  Edit3, 
  Settings, 
  LogOut, 
  Camera, 
  Video, 
  Bookmark, 
  MapPin, 
  Grid, 
  Play, 
  Heart, 
  Users,
  PackageCheck
} from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';

// Lazy load modals to improve initial page load and memory usage
const AvatarCropperModal = dynamic(() => import('@/components/ui/AvatarCropperModal'), { ssr: false });
const EditProfileModal = dynamic(() => import('@/components/profile/EditProfileModal'), { ssr: false });
const PostModal = dynamic(() => import('@/components/feed/PostModal'), { ssr: false });

const tabs = ['posts', 'vibe', 'saved', 'checkIn', 'tickets'] as const;

interface UserProfile {
  display_name: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

interface UserPost {
  id: string;
  media_url: string;
  media_type?: 'video' | 'photo';
  likes_count?: number;
  caption?: string;
  created_at: string;
  venue?: { name: string } | null;
  location_name?: string;
  profiles?: any;
}

interface UserStory {
  id: string;
  media_url: string;
  created_at: string;
}

interface UserCheckIn {
  id: string;
  created_at: string;
  venue?: { name: string; address: string | null; slug: string } | null;
  event?: { title: string; id: string } | null;
}

interface UserTicket {
  id: string;
  qr_code: string;
  status: string;
  quantity?: number;
  event?: {
    id: string;
    title: string;
    starts_at: string;
    venue?: { name: string; city: string | null } | null;
  } | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('posts');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [vibe, setVibe] = useState<UserPost[]>([]);
  const [checkIns, setCheckIns] = useState<UserCheckIn[]>([]);
  const [ticketsData, setTickets] = useState<UserTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<UserPost | null>(null);
  const [privacy, setPrivacy] = useState<'friends' | 'public' | 'private'>('friends');
  
  const t = useTranslations('profile');
  const locale = useLocale();
  const pathname = usePathname();

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        router.push('/login');
        return;
      }

      try {
        const { data: profileData } = await supabase
          .from('users')
          .select('display_name, username, bio, avatar_url, is_verified, map_visibility, vibe_points')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData as any);
        }
      } catch (err) {
        console.error('[Profile] Fetch profile exception:', err);
      }

      // 2. Carica Post (Media)
      const { data: mediaData } = await (supabase.from('media') as any)
        .select('*, venue:venues(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (mediaData) {
        const photoPosts = mediaData.filter((m: any) => m.media_type === 'photo');
        const videoPosts = mediaData.filter((m: any) => m.media_type === 'video' || m.media_type === 'reel');
        setPosts(photoPosts as any);
        setVibe(videoPosts as any);
      }

      // 4. Carica Check-ins
      const { data: checkInData } = await supabase
        .from('check_ins')
        .select(`
          *,
          venue:venues(name, address, slug)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (checkInData) setCheckIns(checkInData);

      // 5. Conta follower/seguiti
      const { count: followersCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id)
        .eq('entity_type', 'user');

      const { count: followingCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id)
        .eq('entity_type', 'user');

      setFollowerCount(followersCount || 0);
      setFollowingCount(followingCount || 0);

      // 6. Carica Biglietti
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select(`
          *,
          event:events (
            id,
            title,
            starts_at,
            venue:venues ( name, city )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ticketsData) setTickets(ticketsData);

      setIsLoading(false);
    };

    loadProfile();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleAvatarUpdated = (newUrl: string) => {
    if (profile) setProfile({ ...profile, avatar_url: newUrl });
    setIsCropperOpen(false);
  };

  const handleProfileUpdate = (updatedData: { display_name: string; bio: string | null }) => {
    if (profile) {
      setProfile({
        ...profile,
        display_name: updatedData.display_name,
        bio: updatedData.bio
      });
    }
    setIsEditModalOpen(false);
  };

  const handleShare = async () => {
    const shareData = {
      title: `Profilo di ${profile?.display_name || profile?.username} su Vibe`,
      text: profile?.bio || 'Scopri il mio profilo su Vibe!',
      url: typeof window !== 'undefined' ? window.location.href : ''
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiato negli appunti! 🔗');
    }
  };

  if (isLoading) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] gpu-accelerated">
        <div className="w-12 h-12 border-4 border-vibe-purple/30 border-t-vibe-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-container gpu-accelerated">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative">
          <div className="flex items-center gap-4">
             <BackButton className="!static" />
             <h1 className="font-display text-2xl font-bold vibe-gradient-text tracking-tighter">{t('title')}</h1>
          </div>
          <button 
            onClick={() => router.push('/settings')}
            className="glass-card-static p-2 hover:bg-white/10 transition-all rounded-xl interactive-hover"
          >
            <Settings className="w-5 h-5 text-vibe-text" />
          </button>
        </div>

        {/* Profilo Card */}
        <Card className="p-6 mb-6 glass-card-static">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group cursor-pointer tap-scale" onClick={() => setIsCropperOpen(true)}>
              <div className="story-ring p-1 rounded-full group-hover:scale-105 transition-transform duration-300">
                <Avatar size="xl" src={profile?.avatar_url} fallback={profile?.display_name || 'U'} className="border-4 border-vibe-dark gpu-accelerated" />
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-vibe-purple flex items-center justify-center border-2 border-vibe-dark shadow-lg group-hover:scale-110 transition-transform">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h2 className="font-display text-xl font-black">{profile?.display_name || 'Vibe User'}</h2>
                {profile?.is_verified && <Badge variant="verified">✓</Badge>}
              </div>
              <p className="text-sm text-vibe-text-secondary font-medium">@{profile?.username || 'utente'}</p>
              {profile?.bio && (
                <p className="text-sm text-vibe-text/80 mt-2 max-w-md leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-center sm:justify-start gap-8 mt-6 pt-4 border-t border-white/5">
            <div className="text-center">
              <p className="font-black text-lg">{posts.length}</p>
              <p className="text-[10px] uppercase font-bold text-vibe-text-secondary tracking-widest">{t('posts')}</p>
            </div>
            <div className="text-center">
              <p className="font-black text-lg">{followerCount.toLocaleString()}</p>
              <p className="text-[10px] uppercase font-bold text-vibe-text-secondary tracking-widest">{t('followers')}</p>
            </div>
            <div className="text-center">
              <p className="font-black text-lg">{followingCount}</p>
              <p className="text-[10px] uppercase font-bold text-vibe-text-secondary tracking-widest">{t('following')}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button 
                variant="secondary" 
                className="flex-1 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 h-11 rounded-xl interactive-hover"
                onClick={() => setIsEditModalOpen(true)}
            >
              <Edit3 className="w-4 h-4" /> {t('editProfile')}
            </Button>
            <Link href="/profile/circles">
              <Button 
                  variant="ghost" 
                  className="h-11 w-11 p-0 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center interactive-hover"
              >
                <Users className="w-5 h-5 text-vibe-purple" />
              </Button>
            </Link>
            <Button 
                variant="ghost" 
                className="h-11 w-11 p-0 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center interactive-hover"
                onClick={handleShare}
            >
              <Share2 className="w-5 h-5 text-white/70" />
            </Button>
          </div>
        </Card>

        {/* Content Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/5 relative gpu-accelerated">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 relative z-10 ${
                activeTab === tab ? 'text-white' : 'text-vibe-text-secondary hover:text-vibe-text'
              }`}
            >
              {activeTab === tab && (
                <div 
                  className="absolute inset-0 bg-vibe-purple/20 rounded-lg border border-vibe-purple/30 transition-all duration-300"
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-2">
                {tab === 'posts' ? <Grid className="w-4 h-4" /> : 
                 tab === 'vibe' ? <Play className="w-4 h-4" /> : 
                 tab === 'saved' ? <Bookmark className="w-4 h-4" /> : 
                 tab === 'tickets' ? <PackageCheck className="w-4 h-4" /> :
                 <MapPin className="w-4 h-4" />} 
                <span className="hidden sm:inline">{t(tab)}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[300px] animate-fade-in gpu-accelerated">
          {activeTab === 'posts' ? (
            <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
              {posts.length > 0 ? posts.map((post) => (
                <div 
                  key={post.id} 
                  onClick={() => setSelectedPost(post)}
                  className="relative aspect-square bg-white/5 group cursor-pointer overflow-hidden border border-white/5 tap-scale"
                >
                  <Image 
                    src={post.media_url} 
                    alt="" 
                    fill
                    sizes="(max-width: 768px) 33vw, 200px"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 gpu-accelerated" 
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                    <Heart className="opacity-0 group-hover:opacity-100 transition-all duration-300 w-5 h-5 text-white fill-white" />
                  </div>
                </div>
              )) : (
                <div className="col-span-3">
                  <EmptyState
                    icon={Camera}
                    title="Ancora nessun post"
                    description="Le tue foto appariranno qui."
                    actionLabel="Crea Post"
                    onAction={() => router.push('/create')}
                  />
                </div>
              )}
            </div>
          ) : activeTab === 'vibe' ? (
            <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
              {vibe.length > 0 ? vibe.map((v) => (
                <div 
                  key={v.id} 
                  onClick={() => setSelectedPost({ ...v, profiles: { ...profile, username: profile?.username } } as any)}
                  className="relative aspect-[9/16] bg-black group cursor-pointer overflow-hidden border border-white/5 tap-scale"
                >
                  <Image 
                    src={v.media_url || '/placeholder.png'} 
                    alt="" 
                    fill
                    sizes="(max-width: 768px) 33vw, 200px"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-70 group-hover:opacity-100 gpu-accelerated" 
                  />
                  <div className="absolute top-2 right-2 z-10">
                     <Play className="w-4 h-4 text-white drop-shadow-lg" />
                  </div>
                </div>
              )) : (
                <div className="col-span-3">
                  <EmptyState
                    icon={Video}
                    title="Nessun Vibe"
                    description="I tuoi video verticali appariranno qui."
                    actionLabel="Registra Vibe"
                    onAction={() => router.push('/create')}
                  />
                </div>
              )}
            </div>
          ) : activeTab === 'checkIn' ? (
            <div className="space-y-3">
              {checkIns.length > 0 ? checkIns.map((ci) => {
                const v = Array.isArray(ci.venue) ? ci.venue[0] : ci.venue;
                const e = Array.isArray(ci.event) ? ci.event[0] : ci.event;
                return (
                  <Card key={ci.id} className="p-4 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer interactive-hover">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-vibe-purple/10 flex items-center justify-center text-xl">
                        {v ? '🏢' : '🎉'}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm tracking-tight">{v?.name || e?.title || t('checkIn')}</h4>
                        <p className="text-xs text-vibe-text-secondary flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {v?.address || t('nearby')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="live" className="animate-pulse">LIVE</Badge>
                  </Card>
                );
              }) : (
                <div className="col-span-3">
                  <EmptyState
                    icon={MapPin}
                    title="Nessun check-in"
                    description="Esplora i locali intorno a te."
                    actionLabel="Apri Mappa"
                    onAction={() => router.push('/map')}
                  />
                </div>
              )}
            </div>
          ) : activeTab === 'tickets' ? (
            <div className="space-y-4">
              {ticketsData.length > 0 ? ticketsData.map((tk) => (
                <Card key={tk.id} className="p-0 overflow-hidden border-white/5 bg-white/5 group relative">
                  <div className="flex flex-col md:flex-row relative z-10">
                    <div className="p-6 flex-1">
                      <div className="flex items-center gap-2 mb-3">
                         <Badge variant="premium">VIBE PASS</Badge>
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tighter vibe-gradient-text mb-1">{tk.event?.title}</h3>
                      <p className="text-xs text-vibe-text-secondary flex items-center gap-2">
                         <MapPin className="w-3 h-3 text-vibe-purple" /> {tk.event?.venue?.name || 'Vibe Location'}
                      </p>
                    </div>
                    <div className="p-4 bg-white/5 flex items-center justify-center">
                       <div className="w-24 h-24 bg-white rounded-xl p-1.5">
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${tk.qr_code}`} alt="QR" className="w-full h-full" />
                       </div>
                    </div>
                  </div>
                </Card>
              )) : (
                <div className="col-span-3">
                  <EmptyState
                    icon={PackageCheck}
                    title="Nessun biglietto"
                    description="I tuoi pass per gli eventi appariranno qui."
                    actionLabel="Scopri Eventi"
                    onAction={() => router.push('/events')}
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Logout */}
        <div className="mt-12 text-center pb-10">
          <p className="text-[9px] text-vibe-text-secondary uppercase tracking-widest opacity-30 mb-4 font-bold">Vibe Platform v4.1 — Optimized</p>
          <Button variant="ghost" className="text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-2xl px-8 transition-all" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> {t('logout')}
          </Button>
        </div>

        {selectedPost && (
          <PostModal 
            isOpen={!!selectedPost} 
            onClose={() => setSelectedPost(null)} 
            post={selectedPost} 
          />
        )}

        {isCropperOpen && (
          <AvatarCropperModal 
            isOpen={isCropperOpen} 
            onClose={() => setIsCropperOpen(false)} 
            onAvatarUpdated={handleAvatarUpdated}
            currentAvatarUrl={profile?.avatar_url}
          />
        )}

        {isEditModalOpen && profile && (
           <EditProfileModal
             isOpen={isEditModalOpen}
             onClose={() => setIsEditModalOpen(false)}
             profile={{
               display_name: profile.display_name,
               username: profile.username,
               bio: profile.bio
             }}
             onUpdate={handleProfileUpdate}
           />
        )}
    </div>
  );
}
