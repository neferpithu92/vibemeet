'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export default function UserProfilePage() {
  const { username } = useParams();
  const supabase = createClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();
      
      if (data) setProfile(data as unknown as UserProfile);
      setLoading(false);
    }
    fetchProfile();
  }, [username, supabase]);

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-20">Caricamento...</div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center pt-20 text-vibe-text-secondary">Profilo non trovato.</div>;

  return (
    <div className="min-h-screen pt-24 px-4 max-w-4xl mx-auto">
      <div className="flex flex-col items-center mb-8">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-vibe-purple/20 border-4 border-vibe-purple mb-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name || 'User'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-bold">
              {profile.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold">{profile.full_name || `@${profile.username}`}</h1>
        <p className="text-vibe-text-secondary">@{profile.username}</p>
      </div>

      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-8">
        <h2 className="text-xl font-bold mb-4">Bio</h2>
        <p className="text-vibe-text-secondary">{profile.bio || 'Nessuna biografia disponibile.'}</p>
      </div>
    </div>
  );
}
