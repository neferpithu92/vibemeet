'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';
import { Send, ArrowLeft, ShieldCheck, Lock, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function ChatWindow({ conversationId, onBack }: { conversationId: string, onBack?: () => void }) {
  const t = useTranslations('social');
  const { 
    messages, 
    conversations, 
    fetchMessages, 
    sendMessage, 
    handleRealtimeMessage 
  } = useChatStore();
  
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
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

    // Listen for new messages in this conversation
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
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, fetchMessages, handleRealtimeMessage, supabase]);

  const markMessagesAsRead = async () => {
    if (!currentUser || !messages.length) return;
    const unreadIds = messages
      .filter(m => m.sender_id !== currentUser.id && !m.read_at)
      .map(m => m.id);
    
    if (unreadIds.length > 0) {
      await supabase
        .from('direct_messages')
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

  const handleSend = async () => {
    if (!newMessage.trim() || !otherUser?.id || !otherUser?.public_key) return;

    try {
      await sendMessage(newMessage, otherUser.id, otherUser.public_key);
      setNewMessage('');
    } catch (error) {
      console.error("Failed to send VEL message:", error);
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
            <div key={msg.id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm relative group ${
                isOwn ? 'bg-vibe-purple text-white rounded-br-none shadow-[0_4px_15px_rgba(157,78,221,0.2)]' : 'bg-white/10 text-vibe-text rounded-bl-none'
              }`}>
                {msg.decrypted_content || (msg.sender_id === currentUser?.id ? msg.encrypted_content : '[Cifratura in corso...]')}
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
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-white/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('typeMessage', { fallback: 'Scrivi un messaggio...' })}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-vibe-purple/50 transition-all"
          />
          <Button onClick={handleSend} className="rounded-xl px-3 py-2 bg-vibe-purple hover:bg-vibe-purple/80">
            <Send className="w-5 h-5 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}
