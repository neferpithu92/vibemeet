'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function ChatPage() {
  const supabase = createClient();
  const { 
    conversations, 
    activeConversationId, 
    messages, 
    isLoading,
    fetchConversations, 
    setActiveConversation, 
    fetchMessages, 
    sendMessage,
    handleRealtimeMessage 
  } = useChatStore();
  const t = useTranslations('chat');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showList, setShowList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        await fetchConversations(user.id);
      }
    };
    init();

    // Sottoscrizione Realtime VEL
    const channel = supabase
      .channel('vel-dm-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => handleRealtimeMessage(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
      if (window.innerWidth < 1024) setShowList(false);
    }
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversationId) return;

    const conv = conversations.find(c => c.id === activeConversationId);
    if (!conv?.other_user?.id || !conv?.other_user?.public_key) return;

    try {
      await sendMessage(newMessage, conv.other_user.id, conv.other_user.public_key);
      setNewMessage('');
    } catch (error) {
      console.error("Failed to send encrypted message:", error);
    }
  };

  const activeConv = conversations.find(c => c.id === activeConversationId);

  return (
    <div className="flex h-[calc(100vh-140px)] overflow-hidden bg-vibe-dark">
      {/* Sidebar - Conversation List */}
      <div className={`
        ${showList ? 'flex' : 'hidden'} lg:flex
        flex-col w-full lg:w-80 border-r border-white/5 bg-vibe-surface/50
      `}>
        <div className="p-4 border-b border-white/5 flex justify-between items-center">
          <h1 className="text-xl font-bold font-display vibe-gradient-text">{t('title')}</h1>
          <div className="text-[10px] px-2 py-1 rounded-full bg-vibe-purple/20 text-vibe-purple border border-vibe-purple/30">
            {t('e2e')}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-2xl transition-all
                ${activeConversationId === conv.id ? 'bg-vibe-purple/10 border border-vibe-purple/20' : 'hover:bg-white/5 border border-transparent'}
              `}
            >
              <div className="w-12 h-12 rounded-full bg-vibe-gradient p-[2px]">
                <div className="w-full h-full rounded-full bg-vibe-dark overflow-hidden flex items-center justify-center">
                  {conv.other_user?.avatar_url ? (
                    <img 
                      src={conv.other_user.avatar_url} 
                      alt="avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
                    />
                  ) : (
                    <span className="font-bold text-white text-sm">
                      {(conv.other_user?.display_name || conv.other_user?.username || '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <p className="font-semibold text-sm truncate">{conv.other_user?.display_name || 'Utente'}</p>
                <p className="text-xs text-vibe-text-secondary truncate">{t('decrypting')}</p>
              </div>
              <p className="text-[10px] text-vibe-text-secondary">
                {format(new Date(conv.last_message_at), 'HH:mm')}
              </p>
            </button>
          ))}
          
          {conversations.length === 0 && (
            <div className="text-center py-12 opacity-50 space-y-2">
              <p className="text-2xl">🙊</p>
              <p className="text-sm">{t('noConversations')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`
        ${!showList ? 'flex' : 'hidden'} lg:flex
        flex-col flex-1 relative
      `}>
        {activeConversationId ? (
          <>
            {/* Header */}
            <header className="p-4 border-b border-white/5 bg-vibe-surface/30 flex items-center gap-3">
              <button 
                onClick={() => setShowList(true)}
                className="lg:hidden p-2 hover:bg-white/5 rounded-xl text-vibe-purple"
              >
                ←
              </button>
              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 flex items-center justify-center bg-vibe-surface">
                {activeConv?.other_user?.avatar_url ? (
                  <img 
                    src={activeConv.other_user.avatar_url} 
                    alt="avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
                  />
                ) : (
                  <span className="font-bold text-vibe-purple text-sm">
                    {(activeConv?.other_user?.display_name || activeConv?.other_user?.username || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold">{activeConv?.other_user?.display_name}</p>
                <p className="text-[10px] text-vibe-cyan flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-vibe-cyan animate-pulse" />
                  {t('velConnection')}
                </p>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('/grid.svg')] bg-repeat">
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUser?.id;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`
                      max-w-[80%] p-3 rounded-2xl text-sm relative
                      ${isMe ? 'bg-vibe-purple text-white rounded-tr-none' : 'glass-card text-vibe-text rounded-tl-none'}
                    `}>
                      <p>{msg.decrypted_content || t('encrypted')}</p>
                      <p className={`text-[9px] mt-1 opacity-60 text-right`}>
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-vibe-surface/80 border-t border-white/5">
              <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-1 border border-white/10 focus-within:border-vibe-purple/50 transition-all">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('placeholder')}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-3 py-2 outline-none"
                />
                <Button type="submit" size="sm" className="rounded-xl px-4">
                  {t('send')}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[url('/grid.svg')] bg-repeat">
            <div className="w-24 h-24 rounded-3xl bg-vibe-gradient flex items-center justify-center mb-6 shadow-2xl glow-purple animate-float">
              <span className="text-white text-4xl">🔒</span>
            </div>
            <h2 className="text-2xl font-bold font-display vibe-gradient-text mb-2">{t('securityTitle')}</h2>
            <p className="text-vibe-text-secondary max-w-sm mb-8">
              {t('securityDescription')}
            </p>
            <Button onClick={() => setShowList(true)} variant="outline" className="lg:hidden">
              {t('seeConversations')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
