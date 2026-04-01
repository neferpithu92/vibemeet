'use client';

import { useState, useEffect } from 'react';
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
  Calendar
} from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';
import PostModal from '@/components/feed/PostModal';
import { localeNames } from '@/lib/i18n/config';

const tabs = ['Post', 'Vibe', 'Saved', 'Check-in'] as const;

const userPosts = [
  { id: '1', type: 'photo', likes: 45, comments: 8, venue: 'Club Paradiso' },
  { id: '2', type: 'reel', likes: 234, comments: 23, venue: 'Gaswerk' },
  { id: '3', type: 'photo', likes: 89, comments: 12, venue: 'Lido Lounge' },
  { id: '4', type: 'photo', likes: 12, comments: 2, venue: 'Biergarten Alpen' },
  { id: '5', type: 'reel', likes: 567, comments: 45, venue: 'Club Paradiso' },
  { id: '6', type: 'photo', likes: 34, comments: 5, venue: 'Rooftop CH' },
];

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
  likes_count?: number;
  venue?: any;
}

interface UserStory {
  id: string;
  media_url: string;
  created_at: string;
}

interface UserCheckIn {
  id: string;
  created_at: string;
  venue?: { name: string; address: string; slug: string };
  event?: { title: string; id: string };
}

/**
 * Pagina Profilo utente — carica dati reali da Supabase.
 */
export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('Post');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [vibe, setVibe] = useState<UserPost[]>([]);
  const [stories, setStories] = useState<UserStory[]>([]);
  const [checkIns, setCheckIns] = useState<UserCheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
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
        router.push('/login');
        return;
      }

      // 1. Carica profilo utente
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('display_name, username, bio, avatar_url, is_verified, map_visibility')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('ERROR (users table):', profileError);
          // If 406 (PGRST106), it means some columns are missing. Try a minimal select as fallback.
          if (profileError.code === 'PGRST106') {
             const { data: fallbackData } = await supabase
               .from('users')
               .select('username, avatar_url')
               .eq('id', user.id)
               .single();
             if (fallbackData) setProfile(fallbackData as any);
          }
        } else if (profileData) {
          setProfile(profileData);
        }
      } catch (err) {
        console.error('Fetch profile exception:', err);
      }

      // 2. Carica Post (Media)
      const { data: mediaData } = await supabase
        .from('media')
        .select(`
          *,
          venue:venues(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (mediaData) {
        const photoPosts = mediaData.filter(m => m.media_type === 'photo' || !m.media_url?.includes('.mp4'));
        const videoPosts = mediaData.filter(m => m.media_type === 'video' || m.media_url?.includes('.mp4'));
        setPosts(photoPosts);
        setVibe(videoPosts);
      }

      // 3. Carica Storie attive
      const { data: storiesData } = await supabase
        .from('stories')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });
      
      if (storiesData) setStories(storiesData);

      // 4. Carica Check-ins per tab Eventi/Stato
      const { data: checkInData } = await supabase
        .from('check_ins')
        .select(`
          *,
          venue:venues(name, address),
          event:events(title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (checkInData) setCheckIns(checkInData);

      // 5. Conta follower/seguiti
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', user.id)
      ]);

      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);
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
      await supabase.from('users').update({ map_visibility: nextMode }).eq('id', session.user.id);
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
                {tab === 'Post' ? <Grid className="w-4 h-4" /> : 
                 tab === 'Vibe' ? <Play className="w-4 h-4" /> : 
                 tab === 'Saved' ? <Bookmark className="w-4 h-4" /> : 
                 <MapPin className="w-4 h-4" />} 
                <span className="hidden sm:inline">{tab}</span>
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
            {activeTab === 'Post' ? (
          <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
            {posts.length > 0 ? posts.map((post) => (
              <motion.div 
                key={post.id} 
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedPost({ ...post, profiles: { ...profile, username: profile?.username } })}
                className="relative aspect-square bg-white/5 group cursor-pointer overflow-hidden border border-white/5"
              >
                <img 
                  src={post.media_url} 
                  alt="" 
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
        ) : activeTab === 'Vibe' ? (
          <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
            {vibe.length > 0 ? vibe.map((v) => (
              <motion.div 
                key={v.id} 
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedPost({ ...v, profiles: { ...profile, username: profile?.username } })}
                className="relative aspect-square bg-black group cursor-pointer overflow-hidden border border-white/5"
              >
                <img 
                  src={v.media_url || '/placeholder.png'} 
                  alt="" 
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
        ) : activeTab === 'Check-in' ? (
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
        ) : (
          <div className="py-20 text-center glass-card border-dashed">
            <p className="text-vibe-text-secondary text-sm">{t('noContent')} 🔖</p>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
        <Card className="mt-6 p-4">
          <h3 className="font-display font-bold text-sm mb-4">⚙️ {t('quickSettings')}</h3>
          <div className="space-y-2">
            {[
              { label: t('language'), icon: '🌐', href: '/settings?tab=lingua' },
              { label: t('privacy'), icon: '🔒', href: '/settings?tab=privacy' },
              { label: t('notifications'), icon: '🔔', href: '/settings?tab=notifiche' },
              { label: 'GDPR / Dati', icon: '📥', href: '/settings?tab=account' },
              { label: t('settings'), icon: '⚙️', href: '/settings' },
            ].map((setting) => (
              <Link 
                key={setting.label} 
                href={setting.href as any}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
              >
                <span className="group-hover:scale-125 transition-transform">{setting.icon}</span>
                <span className="text-sm font-medium flex-1 text-left">{setting.label}</span>
                <svg className="w-4 h-4 text-vibe-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            ))}
          </div>
        </Card>

        {/* Logout */}
        <div className="mt-6 text-center">
          <Button variant="ghost" className="text-red-400 hover:text-red-300" onClick={handleLogout}>
            {t('logout')}
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
