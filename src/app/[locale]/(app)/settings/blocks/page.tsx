'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';

interface BlockedUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  blocked_at: string;
}

export default function BlockedUsersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlocked();
  }, []);

  const fetchBlocked = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select(`
          created_at,
          users!user_blocks_blocked_id_fkey (id, username, display_name, avatar_url)
        `)
        .eq('blocker_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const parsed = data.map((d: any) => ({
        id: d.users.id,
        username: d.users.username,
        display_name: d.users.display_name,
        avatar_url: d.users.avatar_url,
        blocked_at: d.created_at
      }));

      setBlockedUsers(parsed);
    } catch (e) {
      console.error("Errore nel carimento utenti bloccati:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .match({ blocker_id: session.user.id, blocked_id: userId });

    if (!error) {
      setBlockedUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  return (
    <div className="page-container p-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-display font-bold">Utenti Bloccati</h1>
      </div>

      <p className="text-vibe-text-secondary mb-6">
        Questi utenti non potranno inviarti messaggi, vedere i tuoi post o commentare. Neanche tu vedrai i loro contenuti.
      </p>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-20 skeleton w-full" />)}
        </div>
      ) : blockedUsers.length === 0 ? (
        <div className="glass-card p-12 text-center text-vibe-text-secondary">
          <span className="text-4xl block mb-4">🕊️</span>
          Non hai nessun utente bloccato.
        </div>
      ) : (
        <div className="space-y-4">
          {blockedUsers.map(user => (
            <div key={user.id} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {user.avatar_url ? (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10">
                    <Image src={user.avatar_url} alt={user.username} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-xl">👤</span>
                  </div>
                )}
                <div>
                  <h3 className="font-bold">{user.display_name || user.username}</h3>
                  <p className="text-xs text-vibe-text-secondary">@{user.username}</p>
                </div>
              </div>
              <Button onClick={() => handleUnblock(user.id)} variant="outline" className="text-xs py-2 px-4 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20">
                Sblocca
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
