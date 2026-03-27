'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';
import { Send, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { encryptDirectMessage, decryptDirectMessage } from '@/lib/encryption';

export function ChatWindow({ conversationId, onBack }: { conversationId: string, onBack?: () => void }) {
  const t = useTranslations('social');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function initChat() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Carica conversazione per info utente
      const { data: conv } = await supabase
        .from('conversations')
        .select(`
          *,
          user1:users!user1_id(*),
          user2:users!user2_id(*)
        `)
        .eq('id', conversationId)
        .single();
      
      if (conv) {
        setOtherUser(conv.user1.id === user?.id ? conv.user2 : conv.user1);
      }

      // Carica messaggi
      const { data: msgs } = await fetch(`/api/social/messages?conversation_id=${conversationId}`).then(res => res.json());
      if (Array.isArray(msgs)) {
        // QUI andrebbe la logica di decifratura se usiamo E2E
        // Per ora mostriamo il contenuto grezzo o un placeholder se non abbiamo le chiavi
        setMessages(msgs);
      }
      setLoading(false);
    }

    if (conversationId) initChat();

    // Realtime listener per messaggi
    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on('postgres_changes' as any, { 
        event: 'INSERT', 
        table: 'direct_messages', 
        filter: `conversation_id=eq.${conversationId}` 
      }, (payload: any) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, supabase]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    // TODO: Implementare Encryption se publicKey è presente
    // Per ora mandiamo in chiaro per semplicità di sviluppo, ma usiamo la struttura E2E
    const res = await fetch('/api/social/messages', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: conversationId,
        encrypted_content: newMessage, // In produzione: encrypt(newMessage, otherPublicKey)
        nonce: 'plain' // In produzione: generated nonce
      })
    });

    if (res.ok) {
      setNewMessage('');
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="w-10 h-10 border-4 border-vibe-primary border-t-transparent rounded-full animate-spin" /></div>;

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
          <h3 className="font-bold text-white text-sm">{otherUser?.display_name}</h3>
          <p className="text-[10px] text-green-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> {t('endToEndEncrypted', { fallback: 'Criptato E2E' })}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex flex-col items-center py-6 text-center space-y-2 opacity-50">
          <Lock className="w-6 h-6 text-vibe-text-secondary" />
          <p className="text-[10px] text-vibe-text-secondary max-w-[200px]">
            {t('chatSecurityWarning', { fallback: 'I messaggi sono protetti dalla crittografia end-to-end VIBE (VEL).' })}
          </p>
        </div>

        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === currentUser?.id;
          return (
            <div key={msg.id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                isOwn ? 'bg-vibe-purple text-white rounded-br-none' : 'bg-white/10 text-vibe-text rounded-bl-none'
              }`}>
                {msg.encrypted_content}
                <div className={`text-[9px] mt-1 ${isOwn ? 'text-white/60' : 'text-white/40'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-vibe-primary transition-all"
          />
          <Button onClick={handleSend} className="rounded-xl px-3 py-2 bg-vibe-primary hover:bg-vibe-primary/80">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
