'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Search, Plus, MessageCircle, Bell } from 'lucide-react';
import { useRouter } from '@/lib/i18n/navigation';
import { formatDistanceToNow } from 'date-fns';
import { it, enUS, de, fr } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface Conversation {
  id: string;
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
  is_muted: boolean;
  partner: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    last_active_at?: string;
  };
}

interface MessagesClientProps {
  conversations: Conversation[];
  currentUserId: string;
}

export default function MessagesClient({ conversations: initialConversations, currentUserId }: MessagesClientProps) {
  const t = useTranslations('messages');
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState(initialConversations);

  const filtered = conversations.filter(c => {
    const name = (c.partner?.display_name || c.partner?.username || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const isOnline = (lastActive?: string) => {
    if (!lastActive) return false;
    return Date.now() - new Date(lastActive).getTime() < 5 * 60 * 1000;
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-vibe-dark/95 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all">
              <Bell className="w-5 h-5 text-vibe-text-secondary" />
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-vibe-purple/20 hover:bg-vibe-purple/30 transition-all">
              <Plus className="w-5 h-5 text-vibe-purple" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vibe-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchConversations')}
            className="input-field pl-9 py-2 text-sm"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="divide-y divide-white/5">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <div className="w-20 h-20 rounded-full bg-vibe-purple/10 flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-vibe-purple" />
            </div>
            <p className="font-bold text-lg">{t('noConversations')}</p>
            <p className="text-vibe-text-secondary text-sm">{t('startChat')}</p>
          </motion.div>
        ) : (
          filtered.map((conv, i) => (
            <motion.button
              key={conv.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-white/5 transition-all text-left ${conv.unread_count > 0 ? 'bg-vibe-purple/5' : ''}`}
              onClick={() => router.push(`/messages/${conv.partner?.id}`)}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full bg-vibe-surface border border-white/10 overflow-hidden flex items-center justify-center">
                  {conv.partner?.avatar_url ? (
                    <img src={conv.partner.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-vibe-purple">
                      {(conv.partner?.display_name || conv.partner?.username || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                {isOnline(conv.partner?.last_active_at) && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-vibe-dark" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold text-sm truncate ${conv.unread_count > 0 ? 'text-white' : 'text-vibe-text'}`}>
                    {conv.partner?.display_name || conv.partner?.username}
                  </span>
                  <span className="text-xs text-vibe-text-secondary shrink-0 ml-2">
                    {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-vibe-text' : 'text-vibe-text-secondary'}`}>
                    {conv.is_muted ? '🔇 ' : ''}{conv.last_message_preview || t('startChat')}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="shrink-0 ml-2 w-5 h-5 bg-vibe-purple rounded-full text-xs text-white flex items-center justify-center font-bold">
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}
