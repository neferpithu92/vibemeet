'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Search, Send, Copy, Share, Users, X, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityType: 'post' | 'event' | 'venue';
  title?: string;
  url?: string;
}

export function ShareModal({ isOpen, onClose, entityId, entityType, title, url }: ShareModalProps) {
  const t = useTranslations('social');
  const supabase = createClient();
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const fullUrl = url || `${typeof window !== 'undefined' ? window.location.origin : ''}/${entityType}/${entityId}`;

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('friends' as any)
      .select(`
        *,
        friend:users!friends_friend_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('user_id', user.id)
      .limit(20);

    setFriends(data?.map(f => (f as any).friend) || []);
    setIsLoading(false);
  };

  const handleForward = async (friendId: string) => {
    setSendingId(friendId);
    try {
      // Future: Logic to send a DM via useChatStore
      setTimeout(() => setSendingId(null), 1000);
    } catch (err) {
      setSendingId(null);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSystemShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'VibeMeet',
          url: fullUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  const filteredFriends = friends.filter(f => 
    f.username.toLowerCase().includes(search.toLowerCase()) || 
    f.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('shareTitle', { fallback: 'Condividi' })}>
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="secondary" 
            className="flex items-center gap-2 justify-center py-6 bg-white/5 border-white/10"
            onClick={handleCopyLink}
          >
            {isCopied ? <Check className="w-5 h-5 text-vibe-cyan" /> : <Copy className="w-5 h-5" />}
            <span className="text-xs">{isCopied ? t('copied', { fallback: 'Copiato' }) : t('copyLink', { fallback: 'Copia Link' })}</span>
          </Button>
          <Button 
            variant="secondary" 
            className="flex items-center gap-2 justify-center py-6 bg-white/5 border-white/10"
            onClick={handleSystemShare}
          >
            <Share className="w-5 h-5" />
            <span className="text-xs">{t('moreOptions', { fallback: 'Altre opzioni' })}</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vibe-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchFriends', { fallback: 'Cerca amici...' })}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-vibe-purple/50"
          />
        </div>

        {/* Friends List */}
        <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="py-10 flex justify-center">
              <div className="w-6 h-6 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredFriends.length > 0 ? (
            filteredFriends.map((friend) => (
              <div 
                key={friend.id} 
                className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={friend.avatar_url} fallback={friend.username[0]} size="sm" />
                  <div>
                    <p className="text-sm font-bold text-white">{friend.display_name}</p>
                    <p className="text-[10px] text-vibe-text-secondary uppercase">@{friend.username}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleForward(friend.id)}
                  disabled={sendingId === friend.id}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    sendingId === friend.id ? 'bg-vibe-cyan/20 text-vibe-cyan' : 'bg-vibe-purple/10 text-vibe-purple hover:bg-vibe-purple hover:text-white'
                  }`}
                >
                  {sendingId === friend.id ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            ))
          ) : (
            <div className="py-10 text-center opacity-40">
              <Users className="w-10 h-10 mx-auto mb-2" />
              <p className="text-xs">{t('noFriendsFound', { fallback: 'Nessun amico trovato' })}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
