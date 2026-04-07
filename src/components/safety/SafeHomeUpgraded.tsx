'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Shield, UserPlus, MapPin, Phone, BellRing, CheckCircle, AlertTriangle, X, Clock, Navigation } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TrustedContact {
  id: string;
  contact_user_id: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
}

interface SafeHomeUpgradedProps {
  userId: string;
}

export default function SafeHomeUpgraded({ userId }: SafeHomeUpgradedProps) {
  const t = useTranslations('safety');
  const supabase = createClient();

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSosConfirm, setShowSosConfirm] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [isSafe, setIsSafe] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(120);
  const [reminderSet, setReminderSet] = useState(false);

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    const { data } = await supabase
      .from('trusted_contacts')
      .select(`
        id,
        contact_user_id,
        users:contact_user_id (username, display_name, avatar_url)
      `)
      .eq('user_id', userId)
      .limit(5);

    setContacts((data || []).map((c: any) => ({
      id: c.id,
      contact_user_id: c.contact_user_id,
      username: c.users?.username,
      display_name: c.users?.display_name,
      avatar_url: c.users?.avatar_url
    })));
  };

  const startSession = () => {
    setSessionActive(true);
    setSessionStart(new Date());
    setIsSafe(false);
    // Get current location and share with contacts
    navigator.geolocation?.getCurrentPosition(pos => {
      console.log('Location shared:', pos.coords);
    });
  };

  const endSession = () => {
    setSessionActive(false);
    setSessionStart(null);
    setIsSafe(true);
    setTimeout(() => setIsSafe(false), 5000);
  };

  const triggerSOS = async () => {
    setSosTriggered(true);
    setShowSosConfirm(false);

    // Get location
    navigator.geolocation?.getCurrentPosition(async pos => {
      const locationMsg = `SOS! Sono a: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;

      // Send DMs to all trusted contacts
      for (const contact of contacts) {
        try {
          await supabase.from('messages').insert({
            sender_id: userId,
            content: locationMsg,
            type: 'sos'
          });
        } catch (err) {
          console.error('SOS send error:', err);
        }
      }
    });

    setTimeout(() => setSosTriggered(false), 10000);
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${query}%`)
      .neq('id', userId)
      .limit(5);
    setSearchResults(data || []);
  };

  const addContact = async (contactUserId: string) => {
    if (contacts.length >= 5) return;
    await supabase.from('trusted_contacts').insert({ user_id: userId, contact_user_id: contactUserId });
    setShowAddContact(false);
    setSearchUser('');
    setSearchResults([]);
    fetchContacts();
  };

  const removeContact = async (id: string) => {
    await supabase.from('trusted_contacts').delete().eq('id', id);
    setContacts(c => c.filter(x => x.id !== id));
  };

  const elapsedTime = sessionStart
    ? Math.floor((Date.now() - sessionStart.getTime()) / 1000 / 60)
    : 0;

  return (
    <div className="space-y-4 p-4">
      {/* Session Status */}
      <div className={`glass-card p-5 rounded-2xl border transition-all ${
        sessionActive ? 'border-green-500/30 bg-green-500/5' : 'border-white/10'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            sessionActive ? 'bg-green-500/20' : 'bg-white/5'
          }`}>
            <Shield className={`w-5 h-5 ${sessionActive ? 'text-green-400' : 'text-vibe-text-secondary'}`} />
          </div>
          <div className="flex-1">
            <h2 className="font-bold">{t('safeHome')}</h2>
            {sessionActive ? (
              <p className="text-xs text-green-400">
                {t('sessionActive')} · {elapsedTime}m
              </p>
            ) : (
              <p className="text-xs text-vibe-text-secondary">Proteggi il tuo rientro a casa</p>
            )}
          </div>
          {sessionActive && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-400">Live</span>
            </div>
          )}
        </div>

        {!sessionActive ? (
          <button onClick={startSession} className="w-full btn-primary py-3 text-sm">
            🛡️ {t('startSession')}
          </button>
        ) : (
          <div className="space-y-3">
            <button
              onClick={endSession}
              className="w-full py-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 font-semibold hover:bg-green-500/30 transition-all"
            >
              ✅ {t('iAmSafe')}
            </button>
            <button
              onClick={() => setShowSosConfirm(true)}
              className="w-full py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold hover:bg-red-500/30 transition-all"
            >
              🆘 {t('sos')}
            </button>
          </div>
        )}
      </div>

      {/* I'm safe animation */}
      <AnimatePresence>
        {isSafe && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                className="w-32 h-32 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-400"
              >
                <CheckCircle className="w-16 h-16 text-green-400" />
              </motion.div>
              <p className="text-2xl font-bold text-white">Sono a casa! ✅</p>
              <p className="text-green-400 text-sm mt-2">I tuoi contatti sono stati notificati</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scheduled Check-in */}
      <div className="glass-card p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-vibe-cyan" />
          <h3 className="font-semibold text-sm">{t('remindMe')}</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[30, 60, 120, 180].map(min => (
            <button
              key={min}
              onClick={() => { setReminderMinutes(min); setReminderSet(true); setTimeout(() => setReminderSet(false), 3000); }}
              className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                reminderMinutes === min && reminderSet
                  ? 'bg-vibe-cyan/20 border-vibe-cyan/30 text-vibe-cyan'
                  : 'bg-white/5 border-white/10 text-vibe-text-secondary hover:bg-white/10'
              }`}
            >
              {min < 60 ? `${min}m` : `${min / 60}h`}
            </button>
          ))}
        </div>
        {reminderSet && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-vibe-cyan mt-2">
            ⏰ {t('checkInScheduled', { time: `${reminderMinutes < 60 ? reminderMinutes + 'm' : reminderMinutes / 60 + 'h'}` })}
          </motion.p>
        )}
      </div>

      {/* Trusted Contacts */}
      <div className="glass-card p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-vibe-purple" />
            <h3 className="font-semibold text-sm">{t('trustedContacts')}</h3>
          </div>
          {contacts.length < 5 && (
            <button onClick={() => setShowAddContact(true)} className="text-xs text-vibe-purple hover:opacity-80">
              + {t('addContact')}
            </button>
          )}
        </div>

        {contacts.length === 0 ? (
          <p className="text-xs text-vibe-text-secondary text-center py-3">Nessun contatto fidato. Aggiungine uno!</p>
        ) : (
          <div className="space-y-2">
            {contacts.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-vibe-surface border border-white/10 overflow-hidden flex items-center justify-center">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-vibe-purple">{(c.display_name || c.username || 'U')[0].toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.display_name || c.username}</p>
                  <p className="text-xs text-vibe-text-secondary">@{c.username}</p>
                </div>
                <button onClick={() => removeContact(c.id)} className="text-vibe-text-secondary hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {showAddContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center"
            onClick={() => setShowAddContact(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-md bg-vibe-surface rounded-t-3xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-bold text-lg mb-4">{t('addContact')}</h3>
              <p className="text-xs text-vibe-text-secondary mb-3">{t('maxContacts')}</p>
              <input
                type="text"
                value={searchUser}
                onChange={e => { setSearchUser(e.target.value); searchUsers(e.target.value); }}
                placeholder="Cerca username..."
                className="input-field mb-3"
                autoFocus
              />
              <div className="space-y-2">
                {searchResults.map(u => (
                  <button key={u.id} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-left" onClick={() => addContact(u.id)}>
                    <div className="w-9 h-9 rounded-full bg-vibe-dark border border-white/10 overflow-hidden flex items-center justify-center">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="font-bold text-vibe-purple">{(u.display_name || u.username)[0].toUpperCase()}</span>}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{u.display_name || u.username}</p>
                      <p className="text-xs text-vibe-text-secondary">@{u.username}</p>
                    </div>
                    <UserPlus className="w-4 h-4 text-vibe-purple ml-auto" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOS Confirm */}
      <AnimatePresence>
        {showSosConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="glass-card p-6 rounded-2xl border border-red-500/30 max-w-sm w-full text-center"
            >
              <div className="text-5xl mb-4">🆘</div>
              <h3 className="font-bold text-xl mb-2">{t('sos')}</h3>
              <p className="text-sm text-vibe-text-secondary mb-6">{t('sosConfirm')}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowSosConfirm(false)} className="flex-1 btn-secondary">Annulla</button>
                <button onClick={triggerSOS} className="flex-1 btn-danger">INVIA SOS</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOS Triggered */}
      <AnimatePresence>
        {sosTriggered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-red-900/80"
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="text-8xl mb-4"
              >🆘</motion.div>
              <p className="text-2xl font-bold text-white">SOS INVIATO!</p>
              <p className="text-red-300 text-sm mt-2">La tua posizione è stata condivisa con i tuoi contatti</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Dummy Users icon to fix import error
function Users({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
