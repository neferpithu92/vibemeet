'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Send, Image as ImageIcon, Camera, MoreVertical, Check, CheckCheck, Paperclip } from 'lucide-react';

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
    markAsRead,
    handleRealtimeMessage 
  } = useChatStore();
  const t = useTranslations('chat');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showList, setShowList] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        await fetchConversations(user.id);
      }
    };
    init();

    const channel = supabase
      .channel('dm-stream-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, handleRealtimeMessage)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchConversations, handleRealtimeMessage]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
      if (window.innerWidth < 1024) setShowList(false);
      
      // Mark as read after a short delay
      const unread = messages.filter(m => !m.read_at && m.sender_id !== currentUser?.id);
      if (unread.length > 0) {
        markAsRead(unread.map(m => m.id));
      }
    }
  }, [activeConversationId, currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, media?: { url: string, type: string }) => {
    e?.preventDefault();
    if (!newMessage.trim() && !media) return;

    const conv = conversations.find(c => c.id === activeConversationId);
    if (!conv?.other_user?.id || !conv?.other_user?.public_key) return;

    try {
      await sendMessage(newMessage, conv.other_user.id, conv.other_user.public_key, media);
      setNewMessage('');
    } catch (error) {
      console.error("Chat Error:", error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'media');
      
      const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const { url } = await res.json();
        const type = file.type.startsWith('video') ? 'video' : 'photo';
        handleSend(undefined, { url, type });
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const activeConv = conversations.find(c => c.id === activeConversationId);

  return (
    <div className="flex h-[calc(100vh-140px)] overflow-hidden bg-vibe-dark rounded-3xl border border-white/5 mx-4 my-2">
      {/* Sidebar */}
      <div className={`${showList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 border-r border-white/5 bg-vibe-surface/40 backdrop-blur-xl`}>
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h1 className="text-xl font-display font-black tracking-tighter text-white">CHATS</h1>
          <div className="p-2 rounded-full bg-vibe-purple/10 text-vibe-purple"><Camera size={18} /></div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeConversationId === conv.id ? 'bg-vibe-purple/20 shadow-lg' : 'hover:bg-white/5'}`}
            >
              <Avatar src={conv.other_user?.avatar_url || ''} fallback={conv.other_user?.username?.[0] || 'U'} size="md" hasStory={true} border={activeConversationId === conv.id} />
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold text-sm text-white truncate">{conv.other_user?.display_name || 'Utente'}</p>
                <p className="text-xs text-white/50 truncate">Messaggio crittografato</p>
              </div>
              <p className="text-[10px] text-white/30 font-medium">{format(new Date(conv.last_message_at), 'HH:mm')}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className={`${!showList ? 'flex' : 'hidden'} lg:flex flex-col flex-1 relative bg-vibe-surface/20`}>
        {activeConversationId ? (
          <>
            <header className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-md flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowList(true)} className="lg:hidden p-2 text-white/50 hover:text-white transition-colors">←</button>
                <Avatar src={activeConv?.other_user?.avatar_url || ''} fallback={activeConv?.other_user?.username?.[0] || 'U'} size="sm" />
                <div>
                  <p className="font-bold text-sm text-white">{activeConv?.other_user?.display_name}</p>
                  <p className="text-[10px] text-vibe-cyan/80 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-vibe-cyan animate-pulse" />
                    Crittografato
                  </p>
                </div>
              </div>
              <button className="p-2 text-white/40 hover:text-white"><MoreVertical size={20} /></button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[url('/img/noise.png')]">
              {messages.map((msg, i) => {
                const isMe = msg.sender_id === currentUser?.id;
                const showAvatar = i === 0 || messages[i-1].sender_id !== msg.sender_id;
                return (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`
                        p-4 rounded-3xl text-sm leading-relaxed shadow-xl
                        ${isMe ? 'bg-vibe-purple text-white rounded-tr-none' : 'bg-white/10 text-white backdrop-blur-xl border border-white/5 rounded-tl-none'}
                      `}>
                        {msg.media_url && (
                          <div className="mb-3 rounded-xl overflow-hidden shadow-lg border border-white/10">
                            {msg.media_type === 'video' ? (
                              <video src={msg.media_url} controls className="max-w-full aspect-video object-cover" />
                            ) : (
                              <img src={msg.media_url} className="max-w-full object-contain" alt="" />
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.decrypted_content || '...'}</p>
                        <div className="flex items-center justify-end gap-1.5 mt-2 opacity-50 text-[9px] font-bold uppercase tracking-wider">
                          {format(new Date(msg.created_at), 'HH:mm')}
                          {isMe && (
                            msg.read_at ? <CheckCheck size={12} className="text-vibe-cyan" /> : <Check size={12} />
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white/5 backdrop-blur-xl border-t border-white/5">
              <div className="flex items-center gap-3 bg-white/5 rounded-full p-2 border border-white/10 focus-within:border-vibe-purple/50 transition-all">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-white/40 hover:text-vibe-purple transition-all">
                  <Paperclip size={20} />
                </button>
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 text-white outline-none"
                />
                <motion.button type="submit" whileTap={{ scale: 0.9 }} className="w-10 h-10 rounded-full bg-vibe-purple flex items-center justify-center text-white shadow-lg shadow-vibe-purple/30">
                  <Send size={18} />
                </motion.button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-vibe-dark to-vibe-surface/20">
            <div className="relative mb-8">
              <div className="w-32 h-32 rounded-[2.5rem] bg-vibe-gradient rotate-12 flex items-center justify-center shadow-2xl animate-float">
                <span className="text-5xl -rotate-12">📨</span>
              </div>
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-vibe-pink flex items-center justify-center text-xl shadow-xl animate-pulse">🔒</div>
            </div>
            <h2 className="text-3xl font-display font-black text-white mb-3">VIBE MESSAGES</h2>
            <p className="text-white/50 max-w-sm mb-10 leading-relaxed">Le tue conversazioni sono protette dalla crittografia end-to-end.<br/>Solo tu e il destinatario potete leggere i messaggi.</p>
            <Button onClick={() => setShowList(true)} variant="outline" className="lg:hidden border-white/10 text-white hover:bg-white/5">Vai alle chat</Button>
          </div>
        )}
      </div>
    </div>
  );
}
