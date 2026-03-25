'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import AvatarCropperModal from '@/components/ui/AvatarCropperModal';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';

const tabs = ['Post', 'Eventi', 'Salvati'] as const;

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
  venue?: any;
  event?: any;
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
  const [stories, setStories] = useState<UserStory[]>([]);
  const [checkIns, setCheckIns] = useState<UserCheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

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
          .select('display_name, username, bio, avatar_url, is_verified')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('ERROR (users table):', profileError);
          // If 406, it means some columns are missing. Try a minimal select as fallback.
          if (profileError.code === 'PGRST106' || profileError.status === 406) {
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
      
      if (mediaData) setPosts(mediaData);

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

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="space-y-6">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-40 rounded" />
                  <Skeleton className="h-4 w-24 rounded opacity-50" />
                </div>
              </div>
              <div className="flex gap-8 pt-4 border-t border-white/5">
                <Skeleton className="h-12 w-16 rounded-lg" />
                <Skeleton className="h-12 w-16 rounded-lg" />
                <Skeleton className="h-12 w-16 rounded-lg" />
              </div>
            </div>
            
            <div className="flex gap-1 p-1 rounded-xl bg-white/5">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="flex-1 h-10 rounded-lg" />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header con impostazioni */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold vibe-gradient-text">Profilo</h1>
          <button className="glass-card p-2 hover:bg-white/10 transition-all rounded-xl">
            <svg className="w-5 h-5 text-vibe-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Profilo Card */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => setIsCropperOpen(true)}>
              <Avatar size="xl" src={profile?.avatar_url} fallback={profile?.display_name || 'U'} />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-bold">Modifica</span>
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h2 className="font-display text-xl font-bold">{profile?.display_name || 'Utente'}</h2>
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
              <p className="text-xs text-vibe-text-secondary">Post</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{followerCount.toLocaleString()}</p>
              <p className="text-xs text-vibe-text-secondary">Follower</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{followingCount}</p>
              <p className="text-xs text-vibe-text-secondary">Seguiti</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <Button variant="secondary" className="flex-1 text-sm">✏️ Modifica profilo</Button>
            <Button variant="ghost" className="text-sm">📤</Button>
          </div>
        </Card>

        {/* Content Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/5">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-vibe-purple/20 text-vibe-purple'
                  : 'text-vibe-text-secondary hover:text-vibe-text'
              }`}
            >
              {tab === 'Post' ? '📷' : tab === 'Eventi' ? '📍' : '🔖'} {tab}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        {activeTab === 'Post' ? (
          <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
            {posts.length > 0 ? posts.map((post) => (
              <div key={post.id} className="relative aspect-square bg-white/5 group cursor-pointer overflow-hidden border border-white/5">
                <img 
                  src={post.media_url} 
                  alt="" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-3 text-white">
                    <span className="text-sm font-bold">❤️ {post.likes_count || 0}</span>
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 truncate max-w-[80%]">
                  <span className="text-[9px] text-white/70 bg-black/30 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {(Array.isArray(post.venue) ? post.venue[0]?.name : post.venue?.name) || 'Vibe Location'}
                  </span>
                </div>
              </div>
            )) : (
              <div className="col-span-3 py-20 text-center glass-card border-dashed">
                <p className="text-vibe-text-secondary text-sm">Non hai ancora postato nulla 📷</p>
              </div>
            )}
          </div>
        ) : activeTab === 'Eventi' ? (
          <div className="space-y-3">
            {checkIns.length > 0 ? checkIns.map((ci) => {
              const v = Array.isArray(ci.venue) ? ci.venue[0] : ci.venue;
              const e = Array.isArray(ci.event) ? ci.event[0] : ci.event;
              return (
                <Card key={ci.id} className="p-4 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer">
                  <div>
                    <h4 className="font-bold text-sm">{v?.name || e?.title || 'Check-in'}</h4>
                    <p className="text-xs text-vibe-text-secondary">{v?.address || 'Posizione registrata'}</p>
                    <p className="text-[10px] text-vibe-purple mt-1 font-medium">
                      {new Date(ci.created_at).toLocaleDateString('it-CH', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <Badge variant="live">CHECK-IN</Badge>
                </Card>
              );
            }) : (
              <div className="py-20 text-center glass-card border-dashed">
                <p className="text-vibe-text-secondary text-sm">Nessun evento o check-in recente 📍</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center glass-card border-dashed">
            <p className="text-vibe-text-secondary text-sm">Elementi salvati appariranno qui 🔖</p>
          </div>
        )}

        {/* Quick Settings */}
        <Card className="mt-6 p-4">
          <h3 className="font-display font-bold text-sm mb-4">⚙️ Impostazioni rapide</h3>
          <div className="space-y-2">
            {[
              { label: 'Lingua', value: 'Italiano', icon: '🌐' },
              { label: 'Privacy mappa', value: 'Solo amici', icon: '🔒' },
              { label: 'Notifiche', value: 'Attive', icon: '🔔' },
              { label: 'Tema', value: 'Scuro', icon: '🌙' },
              { label: 'Esporta dati (GDPR)', value: '', icon: '📥' },
            ].map((setting) => (
              <button key={setting.label} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <span>{setting.icon}</span>
                <span className="text-sm font-medium flex-1 text-left">{setting.label}</span>
                <span className="text-sm text-vibe-text-secondary">{setting.value}</span>
                <svg className="w-4 h-4 text-vibe-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            ))}
          </div>
        </Card>

        {/* Logout */}
        <div className="mt-6 text-center">
          <Button variant="ghost" className="text-red-400 hover:text-red-300" onClick={handleLogout}>
            Esci dall&apos;account
          </Button>
        </div>

        {/* Avatar Cropper Modal (System 8) */}
        <AvatarCropperModal 
          isOpen={isCropperOpen} 
          onClose={() => setIsCropperOpen(false)} 
          onAvatarUpdated={handleAvatarUpdated}
          currentAvatarUrl={profile?.avatar_url}
        />
      </div>
    </div>
  );
}
