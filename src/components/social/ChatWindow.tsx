'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';
import { Send, ArrowLeft, ShieldCheck, Lock, Check, Camera, Image, MoreVertical } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CameraCapture, { type CaptureResult } from '@/components/camera/CameraCapture';
import { motion, AnimatePresence } from 'framer-motion';

export function ChatWindow({ conversationId, onBack }: { conversationId: string, onBack?: () => void }) {
  const t = useTranslations('social');
  const { 
    messages, 
    conversations, 
    fetchMessages, 
    sendMessage, 
    handleRealtimeMessage,
    setTyping,
    typingUsers,
    setTypingUsers
  } = useChatStore();
  
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Find the other user from the conversations list in the store
  const conversation = conversations.find(c => c.id === conversationId);
  const otherUser = conversation?.other_user;

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (conversationId) {
        await fetchMessages(conversationId);
      }
    }
    init();

    // Listen for new messages and presence
    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public',
        table: 'direct_messages', 
        filter: `conversation_id=eq.${conversationId}` 
      }, (payload) => {
        handleRealtimeMessage(payload);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing = Object.values(state)
          .flat()
          .filter((p: any) => p.typing && p.user_id !== currentUser?.id)
          .map((p: any) => p.user_id);
        setTypingUsers(typing);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, fetchMessages, handleRealtimeMessage, supabase, currentUser?.id]);

  const markMessagesAsRead = async () => {
    if (!currentUser || !messages.length) return;
    const unreadIds = messages
      .filter(m => m.sender_id !== currentUser.id && !m.read_at)
      .map(m => m.id);
    
    if (unreadIds.length > 0) {
      await (supabase
        .from('direct_messages') as any)
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);
    }
  };

  useEffect(() => {
    markMessagesAsRead();
  }, [messages, currentUser]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (media?: { url: string, type: string }) => {
    if ((!newMessage.trim() && !media) || !otherUser?.id || !otherUser?.public_key) return;

    try {
      await sendMessage(newMessage, otherUser.id, otherUser.public_key, media);
      setNewMessage('');
      setTyping(false);
    } catch (error) {
      console.error("Failed to send VEL message:", error);
    }
  };

  const onCapture = (result: CaptureResult) => {
    setIsCameraOpen(false);
    handleSend({ url: result.url, type: result.type });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.length > 0) {
      setTyping(true);
      // Auto-stop typing after 3s of inactivity
      const timeout = setTimeout(() => setTyping(false), 3000);
      return () => clearTimeout(timeout);
    } else {
      setTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-vibe-dark/50 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-white/5">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="md:hidden">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Button>
        )}
        <Avatar src={otherUser?.avatar_url} fallback={otherUser?.display_name} size="md" />
        <div className="flex-1">
          <h3 className="font-bold text-white text-sm">{otherUser?.display_name || '...'}</h3>
          <p className="text-[10px] text-vibe-cyan flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> {t('endToEndEncrypted', { fallback: 'Criptato E2E' })}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <div className="flex flex-col items-center py-6 text-center space-y-2 opacity-30">
          <Lock className="w-6 h-6 text-vibe-text-secondary" />
          <p className="text-[10px] text-vibe-text-secondary max-w-[200px]">
            {t('chatSecurityWarning', { fallback: 'I messaggi sono protetti dalla crittografia end-to-end VIBE (VEL).' })}
          </p>
        </div>

        {messages.map((msg: any, i) => {
          const isOwn = msg.sender_id === currentUser?.id;
          return (
            <motion.div 
              key={msg.id || i} 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl relative group overflow-hidden ${
                isOwn 
                  ? 'bg-gradient-to-br from-vibe-purple to-vibe-pink text-white rounded-br-none shadow-[0_8px_20px_rgba(157,78,221,0.25)]' 
                  : 'bg-white/10 backdrop-blur-md text-vibe-text rounded-bl-none border border-white/5'
              }`}>
                {msg.media_url && (
                  <div className="w-full aspect-square md:aspect-video mb-1 overflow-hidden rounded-t-xl">
                    {msg.media_type === 'video' ? (
                      <video src={msg.media_url} className="w-full h-full object-cover" controls />
                    ) : (
                      <img src={msg.media_url} className="w-full h-full object-cover" alt="Media" />
                    )}
                  </div>
                )}
                
                <div className="p-3 pb-2">
                  <p className="text-sm leading-relaxed">
                    {msg.decrypted_content || (msg.sender_id === currentUser?.id ? msg.encrypted_content : '[Cifratura in corso...]')}
                  </p>
                  
                  <div className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${isOwn ? 'text-white/60' : 'text-white/40'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isOwn && (
                      <span className="flex items-center">
                        <Check className={`w-3 h-3 ${msg.read_at ? 'text-vibe-cyan font-bold' : ''}`} />
                        {msg.read_at && <Check className="w-3 h-3 -ml-2 text-vibe-cyan font-bold" />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Typing Indicator */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-[10px] text-vibe-purple/60 italic px-2"
            >
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-vibe-purple rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 bg-vibe-purple rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 bg-vibe-purple rounded-full animate-bounce" />
              </div>
              {otherUser?.display_name} sta scrivendo...
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsCameraOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-vibe-purple transition-colors"
          >
            <Camera className="w-5 h-5" />
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('typeMessage', { fallback: 'Scrivi un messaggio...' })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-vibe-purple/50 transition-all pr-10"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <Image className="w-4 h-4" />
            </button>
          </div>

          <Button onClick={() => handleSend()} className="rounded-xl px-3 py-2 bg-gradient-to-r from-vibe-purple to-vibe-pink hover:opacity-90 shadow-lg">
            <Send className="w-5 h-5 text-white" />
          </Button>
        </div>
      </div>

      {/* Camera Capture Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[1000]">
          <CameraCapture 
            onCapture={onCapture} 
            onClose={() => setIsCameraOpen(false)} 
          />
        </div>
      )}
    </div>
  );
}
