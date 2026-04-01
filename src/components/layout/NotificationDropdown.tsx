'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Heart, UserPlus, MessageSquare, Star, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { it, enUS, de, fr } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface Notification {
  id: string;
  type: 'like' | 'follow' | 'comment' | 'system' | 'mention';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    username: string;
    avatar_url: string;
  };
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const supabase = createClient();

  // Mock initial notifications to "wow" the user and show it's working
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'system',
        title: 'Benvenuto su VIBE!',
        message: 'Il tuo profilo è pronto. Inizia a esplorare la mappa!',
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        is_read: false
      },
      {
        id: '2',
        type: 'follow',
        title: 'Nuovo follower',
        message: 'marco_rossi ha iniziato a seguirti',
        created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        is_read: false,
        sender: {
          username: 'marco_rossi',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marco'
        }
      },
      {
        id: '3',
        type: 'like',
        title: 'Nuovo like',
        message: 'A qualcuno piace il tuo ultimo post a Club Paradiso',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        is_read: true,
        sender: {
          username: 'giulia_vibe',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Giulia'
        }
      }
    ];

    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.is_read).length);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-vibe-pink fill-vibe-pink" />;
      case 'follow': return <UserPlus className="w-4 h-4 text-vibe-purple" />;
      case 'comment': return <MessageSquare className="w-4 h-4 text-vibe-cyan" />;
      case 'mention': return <Star className="w-4 h-4 text-vibe-pink" />;
      default: return <Bell className="w-4 h-4 text-vibe-purple" />;
    }
  };

  const getDateLocale = () => {
    switch (locale) {
      case 'it': return it;
      case 'de': return de;
      case 'fr': return fr;
      default: return enUS;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className="relative p-2 rounded-xl text-vibe-text-secondary hover:text-vibe-text hover:bg-white/5 transition-all group"
      >
        <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-vibe-pink rounded-full ring-2 ring-vibe-dark group-hover:animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-12 w-80 sm:w-96 glass-card overflow-hidden z-50 shadow-2xl origin-top-right"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h3 className="font-display font-bold text-sm">Notifiche</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  className="text-[10px] uppercase font-bold tracking-widest text-vibe-purple hover:text-vibe-pink transition-colors"
                >
                  Segna tutte come lette
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto hide-scrollbar">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div 
                    key={n.id}
                    className={`p-4 flex gap-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 relative ${!n.is_read ? 'bg-vibe-purple/5' : ''}`}
                  >
                    <div className="relative shrink-0">
                      {n.sender ? (
                        <img src={n.sender.avatar_url} alt="" className="w-10 h-10 rounded-full border border-white/10" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-vibe-gradient/20 flex items-center justify-center">
                          <Bell className="w-5 h-5 text-vibe-purple" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-vibe-dark flex items-center justify-center p-0.5">
                        <div className="w-full h-full rounded-full flex items-center justify-center bg-white/5">
                          {getIcon(n.type)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-bold ${n.is_read ? 'text-vibe-text' : 'text-vibe-purple'}`}>{n.title}</p>
                        <span className="text-[10px] text-vibe-text-secondary">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: getDateLocale() })}
                        </span>
                      </div>
                      <p className="text-xs text-vibe-text-secondary leading-relaxed">{n.message}</p>
                    </div>

                    {!n.is_read && (
                      <div className="absolute top-4 right-1 w-1.5 h-1.5 rounded-full bg-vibe-purple" />
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-vibe-text-secondary opacity-50">
                  <Bell className="w-12 h-12 mb-3 stroke-[1px]" />
                  <p className="text-sm">Nessuna notifica</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/5 text-center bg-white/5">
              <button className="text-xs font-medium text-vibe-text-secondary hover:text-white transition-colors">
                Visualizza tutte
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
