'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Send, Camera, Image, Mic, Smile, Check, CheckCheck, MoreVertical, Reply, Copy, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content?: string;
  type: string;
  media_url?: string;
  reply_to_id?: string;
  read_by: string[];
  created_at: string;
  deleted_at?: string;
}

interface Partner {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  last_active_at?: string;
}

interface ChatClientProps {
  partner: Partner;
  currentUserId: string;
  conversationId: string;
  initialMessages: Message[];
}

const EMOJI_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export default function ChatClient({ partner, currentUserId, conversationId, initialMessages }: ChatClientProps) {
  const t = useTranslations('messages');
  const router = useRouter();
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ message: Message; x: number; y: number } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, payload => {
        const msg = payload.new as Message;
        if (msg.sender_id !== currentUserId) {
          setMessages(prev => [...prev, msg]);
        }
      })
      .on('broadcast', { event: 'typing' }, payload => {
        if (payload.payload.userId !== currentUserId) {
          setIsTyping(true);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const broadcastTyping = () => {
    supabase.channel(`chat:${conversationId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId }
    });
  };

  const sendMessage = async () => {
    if (!text.trim() || !conversationId || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      type: 'text',
      reply_to_id: replyTo?.id,
      read_by: [],
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempMsg]);
    setReplyTo(null);

    const { data, error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      type: 'text',
      reply_to_id: replyTo?.id || null
    }).select().single();

    if (data) {
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? data : m));
      // Update conversation preview
      await supabase.from('conversations').update({
        last_message_preview: content.slice(0, 80),
        last_message_at: new Date().toISOString()
      }).eq('id', conversationId);
    }

    setSending(false);
  };

  const deleteMessage = async (msgId: string) => {
    await supabase.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
    setContextMenu(null);
  };

  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    messages.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleDateString('it-IT');
      const group = groups.find(g => g.date === date);
      if (group) group.messages.push(msg);
      else groups.push({ date, messages: [msg] });
    });
    return groups;
  };

  const isOnline = partner.last_active_at && Date.now() - new Date(partner.last_active_at).getTime() < 5 * 60 * 1000;

  return (
    <div className="flex flex-col h-screen bg-vibe-dark">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-vibe-surface border-b border-white/5 shrink-0">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-vibe-text-secondary hover:text-vibe-text">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-vibe-dark border border-white/10 overflow-hidden flex items-center justify-center">
            {partner.avatar_url ? (
              <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-vibe-purple">{(partner.display_name || partner.username)[0].toUpperCase()}</span>
            )}
          </div>
          {isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-vibe-surface" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{partner.display_name || partner.username}</p>
          <p className="text-xs text-vibe-text-secondary">
            {isTyping ? (
              <span className="text-vibe-purple">{t('typing')}</span>
            ) : isOnline ? (
              <span className="text-green-400">{t('online')}</span>
            ) : partner.last_active_at ? (
              `${t('lastSeen', { time: formatTimeAgo(partner.last_active_at) })}`
            ) : ''}
          </p>
        </div>
        <button className="w-10 h-10 flex items-center justify-center text-vibe-text-secondary">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1" onClick={() => setContextMenu(null)}>
        {groupMessagesByDate().map(({ date, messages: dayMsgs }) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <span className="text-xs text-vibe-text-secondary bg-vibe-surface px-3 py-1 rounded-full">
                {date}
              </span>
            </div>
            {dayMsgs.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}
                  onContextMenu={e => { e.preventDefault(); setContextMenu({ message: msg, x: e.clientX, y: e.clientY }); }}
                >
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    isMine
                      ? 'bg-vibe-purple text-white rounded-br-sm'
                      : 'bg-vibe-surface border border-white/5 text-vibe-text rounded-bl-sm'
                  }`}>
                    {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] opacity-60">
                        {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMine && (
                        msg.read_by.includes(partner.id) ? (
                          <CheckCheck className="w-3 h-3 text-blue-300" />
                        ) : (
                          <Check className="w-3 h-3 opacity-60" />
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="bg-vibe-surface border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-vibe-text-secondary rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, delay: i * 0.15, duration: 0.6 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-vibe-surface border-t border-white/5 flex items-center gap-2"
          >
            <div className="w-0.5 h-8 bg-vibe-purple rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-vibe-purple font-semibold">{t('replyTo')}</p>
              <p className="text-xs text-vibe-text-secondary truncate">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-vibe-text-secondary hover:text-vibe-text">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="shrink-0 px-3 py-3 bg-vibe-surface border-t border-white/5 flex items-end gap-2">
        <div className="flex gap-1">
          <button className="w-10 h-10 flex items-center justify-center text-vibe-text-secondary hover:text-vibe-text rounded-full hover:bg-white/5 transition-all">
            <Image className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center text-vibe-text-secondary hover:text-vibe-text rounded-full hover:bg-white/5 transition-all">
            <Camera className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 bg-vibe-dark border border-white/10 rounded-2xl overflow-hidden flex items-end">
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => { setText(e.target.value); broadcastTyping(); }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
            placeholder={t('typeMessage')}
            rows={1}
            className="flex-1 bg-transparent px-4 py-3 text-sm text-vibe-text placeholder-vibe-text-secondary/50 outline-none resize-none max-h-32"
            style={{ height: 'auto' }}
          />
          <button className="px-2 py-2 text-vibe-text-secondary hover:text-vibe-text">
            <Smile className="w-5 h-5" />
          </button>
        </div>
        {text.trim() ? (
          <button
            onClick={sendMessage}
            disabled={sending}
            className="w-11 h-11 flex items-center justify-center bg-vibe-purple rounded-full hover:bg-vibe-purple/80 transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        ) : (
          <button className="w-11 h-11 flex items-center justify-center bg-vibe-surface border border-white/10 rounded-full text-vibe-text-secondary hover:text-vibe-text hover:bg-white/5 transition-all">
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-50 glass-card p-1 min-w-[160px] shadow-2xl"
            style={{ top: Math.min(contextMenu.y, window.innerHeight - 200), left: Math.min(contextMenu.x, window.innerWidth - 180) }}
          >
            <button
              onClick={() => { setReplyTo(contextMenu.message); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 rounded-lg"
            >
              <Reply className="w-4 h-4" /> {t('replyTo')}
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(contextMenu.message.content || ''); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 rounded-lg"
            >
              <Copy className="w-4 h-4" /> {t('copyMessage')}
            </button>
            {contextMenu.message.sender_id === currentUserId && (
              <button
                onClick={() => deleteMessage(contextMenu.message.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg"
              >
                <Trash2 className="w-4 h-4" /> {t('deleteMessage')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTimeAgo(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}g`;
}
