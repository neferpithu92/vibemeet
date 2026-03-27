'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from '@/lib/i18n/navigation';

export function ChatList({ onSelect }: { onSelect: (id: string) => void }) {
  const t = useTranslations('social');
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchConversations() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await fetch('/api/social/messages').then(res => res.json());
      if (!error && Array.isArray(data)) {
        setConversations(data.map(c => {
          const otherUser = c.user1?.id === user.id ? c.user2 : c.user1;
          return { ...c, otherUser };
        }));
      }
      setLoading(false);
    }
    fetchConversations();

    // Sottoscrizione Realtime per aggiornare last_message_at
    const channel = supabase
      .channel('conversations_updates')
      .on('postgres_changes' as any, { event: 'UPDATE', table: 'conversations' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-bold px-4 mb-4 text-white">{t('messages', { fallback: 'Messaggi' })}</h2>
      {conversations.length === 0 ? (
        <div className="text-center py-10 text-vibe-text-secondary">
          <p>{t('noMessages', { fallback: 'Nessuna conversazione ancora.' })}</p>
        </div>
      ) : (
        conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all text-left group"
          >
            <Avatar 
              src={conv.otherUser?.avatar_url} 
              fallback={conv.otherUser?.display_name} 
              size="md"
              isOnline={conv.otherUser?.is_online}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-white truncate">{conv.otherUser?.display_name}</span>
                <span className="text-[10px] text-vibe-text-secondary whitespace-nowrap">
                  {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-vibe-text-secondary truncate group-hover:text-vibe-text transition-colors">
                {conv.last_message_preview || t('clickToChat', { fallback: 'Clicca per chattare' })}
              </p>
            </div>
            {conv.unread_count > 0 && (
              <div className="w-5 h-5 bg-vibe-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-vibe-primary/20">
                {conv.unread_count}
              </div>
            )}
          </button>
        ))
      )}
    </div>
  );
}
