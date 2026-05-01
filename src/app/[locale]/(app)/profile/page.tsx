'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, usePathname, Link } from '@/lib/i18n/navigation';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { locales } from '@/lib/i18n/config';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import AvatarCropperModal from '@/components/ui/AvatarCropperModal';
import EditProfileModal from '@/components/profile/EditProfileModal';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
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
  Ghost,
  Users,
  LayoutGrid,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Calendar,
  PackageCheck
} from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';
import PostModal from '@/components/feed/PostModal';
import { localeNames } from '@/lib/i18n/config';

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

/**
 * Pagina Profilo utente — carica dati reali da Supabase.
 */
export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('posts');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [vibe, setVibe] = useState<UserPost[]>([]);
  const [stories, setStories] = useState<UserStory[]>([]);
  const [checkIns, setCheckIns] = useState<UserCheckIn[]>([]);
  const [ticketsData, setTickets] = useState<UserTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<UserPost | null>(null);
  const [isNotificationsActive, setIsNotificationsActive] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
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

      // 1. Carica profilo utente
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('display_name, username, bio, avatar_url, is_verified, map_visibility, vibe_points')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('[Profile] Database error (users table):', profileError);
          // If columns are missing, attempt a minimal select to keep basic functionality
          const { data: fallbackData } = await supabase
            .from('users')
            .select('username, avatar_url')
            .eq('id', user.id)
            .single();
            
          if (fallbackData) {
            console.warn('[Profile] Using fallback user data');
            setProfile(fallbackData as any);
          }
        } else if (profileData) {
          setProfile(profileData as any);
        }
      } catch (err) {
        console.error('[Profile] Fetch profile exception:', err);
      }

      // 2. Carica Post (Media)
      const { data: mediaData, error: mediaError } = await (supabase.from('media') as any)
        .select('*, venue:venues(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (mediaError) {
        console.error('[Profile] Error loading media:', mediaError);
      } else if (mediaData) {
        const photoPosts = mediaData.filter((m: any) => m.media_type === 'photo');
        const videoPosts = mediaData.filter((m: any) => m.media_type === 'video' || m.media_type === 'reel');
        setPosts(photoPosts as any);
        setVibe(videoPosts as any);
      }

      // 3. Carica Storie attive
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });
      
      if (storiesError) {
        console.error('[Profile] Error loading stories:', storiesError);
      } else if (storiesData) {
        setStories(storiesData as any);
      }

      // 4. Carica Check-ins per tab Eventi/Stato
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

      // 6. Carica Biglietti Reali (Vibe Pass)
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

  const handleLanguageToggle = () => {
    const currentIndex = locales.indexOf(locale as any);
    const nextLocale = locales[(currentIndex + 1) % locales.length];
    
    router.replace(pathname, { locale: nextLocale });
  };

  const handlePrivacyToggle = async () => {
    const modes: ('friends' | 'public' | 'private')[] = ['friends', 'public', 'private'];
    const nextMode = modes[(modes.indexOf(privacy) + 1) % modes.length];
    setPrivacy(nextMode);

    // Sync to DB
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await (supabase as any).from('users').update({ map_visibility: nextMode }).eq('id', session.user.id);
    }
  };

  const handleThemeToggle = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    // Future: implement persistent theme logic here
  };

  const handleNotificationsToggle = () => {
    setIsNotificationsActive(prev => !prev);
  };

  if (isLoading) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-vibe-purple/30 border-t-vibe-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header con impostazioni */}
        <div className="flex items-center justify-between mb-6 relative">
          <div className="flex items-center gap-4">
             <BackButton className="!static" />
             <h1 className="font-display text-2xl font-bold vibe-gradient-text">{t('title')}</h1>
          </div>
          <button 
            onClick={() => router.push('/settings')}
            className="glass-card p-2 hover:bg-white/10 transition-all rounded-xl"
          >
            <Settings className="w-5 h-5 text-vibe-text" />
          </button>
        </div>

        {/* Profilo Card */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => setIsCropperOpen(true)}>
              <div className="story-ring p-1 rounded-full group-hover:scale-105 transition-transform duration-300">
                <Avatar size="xl" src={profile?.avatar_url} fallback={profile?.display_name || 'U'} className="border-4 border-vibe-dark" />
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-vibe-purple flex items-center justify-center border-2 border-vibe-dark shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h2 className="font-display text-xl font-bold">{profile?.display_name || 'Vibe User'}</h2>
                {profile?.is_verified && <Badge variant="verified">✓</Badge>}
              </div>
              <p className="text-sm text-vibe-text-secondary">@{profile?.username || 'utente'}</p>
              {profile?.bio && (
                <p className="text-sm text-vibe-text mt-2 max-w-md">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-center sm:justify-start gap-8 mt-6 pt-4 border-t border-white/5">
            <div className="text-center">
              <p className="font-bold text-lg">{posts.length}</p>
              <p className="text-xs text-vibe-text-secondary">{t('posts')}</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{followerCount.toLocaleString()}</p>
              <p className="text-xs text-vibe-text-secondary">{t('followers')}</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{followingCount}</p>
              <p className="text-xs text-vibe-text-secondary">{t('following')}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <Button 
                variant="secondary" 
                className="flex-1 text-sm font-bold flex items-center justify-center gap-2 h-11 rounded-xl"
                onClick={() => setIsEditModalOpen(true)}
            >
              <Edit3 className="w-4 h-4" /> {t('editProfile')}
            </Button>
            <Link href="/profile/circles">
              <Button 
                  variant="ghost" 
                  className="text-sm h-11 w-11 p-0 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center"
              >
                <Users className="w-5 h-5 text-vibe-purple" />
              </Button>
            </Link>
            <Button 
                variant="ghost" 
                className="text-sm h-11 w-11 p-0 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center"
                onClick={handleShare}
            >
              <Share2 className="w-5 h-5 text-white/70" />
            </Button>
          </div>
        </Card>
        {/* Content Tabs (System 14 - Premium Interactions) */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/5 relative">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors duration-300 relative z-10 ${
                activeTab === tab ? 'text-vibe-purple' : 'text-vibe-text-secondary hover:text-vibe-text'
              }`}
            >
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-vibe-purple/20 rounded-lg border border-vibe-purple/30"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
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

        {/* Content Grid with AnimatePresence */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'posts' ? (
          <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
            {posts.length > 0 ? posts.map((post) => (
              <motion.div 
                key={post.id} 
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedPost(post)}
                className="relative aspect-square bg-white/5 group cursor-pointer overflow-hidden border border-white/5"
              >
                <Image 
                  src={post.media_url} 
                  alt="" 
                  fill
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-3 text-white">
                    <span className="text-sm font-bold flex items-center gap-1">
                       <Heart className="w-4 h-4 text-vibe-pink fill-current" /> 
                       {post.likes_count || 0}
                    </span>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-3">
                <EmptyState
                  icon={Camera}
                  title="Ancora nessun post"
                  description="Le tue foto appariranno qui. Inizia a condividere!"
                  actionLabel="Crea Post"
                  onAction={() => router.push('/create')}
                />
              </div>
            )}
          </div>
        ) : activeTab === 'vibe' ? (
          <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
            {vibe.length > 0 ? vibe.map((v) => (
              <motion.div 
                key={v.id} 
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedPost({ ...v, profiles: { ...profile, username: profile?.username } } as any)}
                className="relative aspect-square bg-black group cursor-pointer overflow-hidden border border-white/5"
              >
                <Image 
                  src={v.media_url || '/placeholder.png'} 
                  alt="" 
                  fill
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-70 group-hover:opacity-100" 
                />
                <div className="absolute top-2 right-2 z-10">
                   <Play className="w-4 h-4 text-white drop-shadow-lg" />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-3 text-white">
                    <span className="text-sm font-bold flex items-center gap-1">
                       <Heart className="w-4 h-4 text-vibe-pink fill-current" /> 
                       {v.likes_count || 0}
                    </span>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-3">
                <EmptyState
                  icon={Video}
                  title="Nessun Vibe"
                  description="I tuoi video verticali appariranno qui. Registra il tuo primo Vibe!"
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
                <Card key={ci.id} className="p-4 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-vibe-gradient/20 flex items-center justify-center text-xl">
                      {v ? '🏢' : '🎉'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-tight">{v?.name || e?.title || t('checkIn')}</h4>
                      <p className="text-xs text-vibe-text-secondary flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {v?.address || t('nearby')}
                      </p>
                      <p className="text-[10px] text-vibe-cyan mt-1.5 font-bold uppercase tracking-widest bg-vibe-cyan/10 w-fit px-2 py-0.5 rounded-full">
                        {new Date(ci.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="live" className="animate-pulse">CHECKED-IN</Badge>
                </Card>
              );
            }) : (
              <div className="col-span-3">
                <EmptyState
                  icon={MapPin}
                  title="Nessun check-in"
                  description="Vai in un locale e fai il check-in per iniziare la tua storia!"
                  actionLabel="Apri Mappa"
                  onAction={() => router.push('/map')}
                />
              </div>
            )}
          </div>
        ) : activeTab === 'tickets' ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {ticketsData.length > 0 ? ticketsData.map((tk) => (
              <Card key={tk.id} className="p-0 overflow-hidden border-vibe-purple/20 bg-vibe-purple/5 group relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-vibe-purple/10 blur-[60px] -mr-16 -mt-16" />
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10 relative z-10">
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                         <Badge variant="premium">{tk.status === 'paid' ? 'VIBE PASS' : tk.status.toUpperCase()}</Badge>
                         <span className="text-[10px] font-bold text-white/40 uppercase">#{tk.qr_code.slice(0, 8)}</span>
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tighter vibe-gradient-text mb-1">{tk.event?.title}</h3>
                      <p className="text-xs text-vibe-text-secondary flex items-center gap-2">
                         <MapPin className="w-3 h-3 text-vibe-purple" /> {tk.event?.venue?.name || 'Vibe Location'}
                      </p>
                      <p className="text-[10px] font-bold text-vibe-cyan uppercase tracking-widest mt-2">
                        {tk.event?.starts_at ? new Date(tk.event.starts_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Date TBD'}
                      </p>
                    </div>
                    <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[10px] text-vibe-text-secondary font-bold uppercase tracking-widest">Active Ticket</span>
                       </div>
                    </div>
                  </div>
                  <div className="p-6 bg-white/5 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-32 h-32 bg-white rounded-2xl p-2 shadow-[0_0_30px_rgba(157,78,221,0.2)] group-hover:scale-105 transition-transform duration-500">
                       <div className={`w-full h-full bg-cover opacity-90 mix-blend-multiply`} style={{ backgroundImage: `url('https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${tk.qr_code}')` }} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase text-vibe-purple tracking-widest">Scan to Validate</p>
                       <p className="text-[9px] text-vibe-text-secondary mt-1">Valid for {tk.quantity || 1} Person</p>
                    </div>
                  </div>
                </div>
              </Card>
            )) : (
              <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-30">
                <PackageCheck className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Nessun biglietto acquistato</p>
                <Link href="/events" className="text-xs text-vibe-purple font-bold mt-4 block hover:underline">Esplora Eventi</Link>
              </div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center glass-card border-dashed">
            <p className="text-vibe-text-secondary text-sm">{t('noContent')} 🔖</p>
          </div>
        )}
          </motion.div>
        </AnimatePresence>

        {/* Logout */}
        <div className="mt-12 text-center pb-10">
          <p className="text-[10px] text-vibe-text-secondary uppercase tracking-widest opacity-30 mb-4">Vibe Platform v4.0</p>
          <Button variant="ghost" className="text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-2xl px-8 transition-all" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> {t('logout')}
          </Button>
        </div>

        <PostModal 
          isOpen={!!selectedPost} 
          onClose={() => setSelectedPost(null)} 
          post={selectedPost} 
        />

        <AvatarCropperModal 
          isOpen={isCropperOpen} 
          onClose={() => setIsCropperOpen(false)} 
          onAvatarUpdated={handleAvatarUpdated}
          currentAvatarUrl={profile?.avatar_url}
        />

        {/* Edit Profile Modal (System 14) */}
        {profile && (
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
    </div>
  );
}
