'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, Link } from '@/lib/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Avatar } from '@/components/ui/Avatar';
import { locales, localeNames } from '@/lib/i18n/config';
import { SubscriptionManager } from '@/components/profile/SubscriptionManager';
import { useToast } from '@/components/ui/ToastProvider';

/**
 * PRODUCTION SETTINGS SYSTEM - VIBEMEET
 * Includes 7 languages, database persistence, and adaptive UI.
 */
export default function SettingsPage() {
  const t = useTranslations('settings');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profilo');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState<any>({
    language: 'it',
    theme: 'dark',
    is_private: false,
    show_activity: true,
    location_radius: '500m',
    push_notifications: true,
    anon_mode: false,
    usage_limit: 0,
    daily_usage: 0,
    weekly_usage: 0,
    allow_replies: true,
    location_sharing: true,
    instagram_linked: false,
    facebook_linked: false,
    tiktok_linked: false
  });

  const [profileData, setProfileData] = useState<{
    username: string;
    display_name: string;
    email: string;
    bio: string;
    avatar_url?: string;
  }>({
    username: '',
    display_name: '',
    email: '',
    bio: ''
  });

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }
      setUser(authUser);

      // Fetch user profile info
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setProfileData({
          username: profile.username || '',
          display_name: profile.display_name || '',
          email: authUser.email || '',
          bio: profile.bio || ''
        });
        setSettings((prev: any) => ({
          ...prev,
          language: profile.language || 'it',
          is_private: profile.account_type === 'private'
        }));
      }

      // Fetch settings from various tables
      const { data: priv } = await supabase.from('privacy_settings').select('*').eq('user_id', authUser.id).single();
      const { data: notif } = await supabase.from('notification_settings').select('*').eq('user_id', authUser.id).single();
      const { data: stor } = await supabase.from('story_settings').select('*').eq('user_id', authUser.id).single();
      const { data: usage } = await supabase.from('usage_stats').select('*').eq('user_id', authUser.id).order('date', { ascending: false }).limit(7);

      if (priv) {
        setSettings((prev: any) => ({
          ...prev,
          show_activity: priv.show_activity_status,
          anon_mode: priv.anon_mode || false
        }));
      }

      if (notif) {
        setSettings((prev: any) => ({
          ...prev,
          push_notifications: notif.push_enabled
        }));
      }

      if (usage) {
        const daily = usage.find((u: any) => u.date === new Date().toISOString().split('T')[0]);
        const weekly = usage.reduce((acc: number, u: any) => acc + (u.minutes_used || 0), 0);
        setSettings((prev: any) => ({
          ...prev,
          daily_usage: daily ? daily.minutes_used : 0,
          weekly_usage: weekly,
          usage_limit: daily ? daily.daily_limit_minutes : 0
        }));
      }

      setLoading(false);
    }
    loadData();
  }, [supabase, router]);

  // Handle tab change from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const saveToDB = async (type: 'profile' | 'privacy' | 'notifications' | 'usage', newData: any) => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (type === 'profile') {
        const { error } = await supabase.from('users').update({
          username: newData.username ?? profileData.username,
          display_name: newData.display_name ?? profileData.display_name,
          bio: newData.bio ?? profileData.bio,
          language: newData.language ?? settings.language,
          account_type: (newData.is_private ?? settings.is_private) ? 'private' : 'public'
        }).eq('id', user.id);
        if (error) throw error;
      } else if (type === 'privacy') {
        const { error } = await supabase.from('privacy_settings').upsert({
          user_id: user.id,
          show_activity_status: newData.show_activity ?? settings.show_activity,
          account_type: (newData.is_private ?? settings.is_private) ? 'private' : 'public'
        });
        if (error) throw error;
      } else if (type === 'notifications') {
        const { error } = await supabase.from('notification_settings').upsert({
          user_id: user.id,
          push_enabled: newData.push_notifications ?? settings.push_notifications
        });
        if (error) throw error;
      } else if (type === 'usage') {
        const { error } = await supabase.from('usage_stats').upsert({
          user_id: user.id,
          date: new Date().toISOString().split('T')[0],
          daily_limit_minutes: newData.usage_limit ?? settings.usage_limit
        }, { onConflict: 'user_id,date' });
        if (error) throw error;
      }
      
      showToast(t('saveSuccess'), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateProfileData = async (newData: any) => {
    setProfileData(prev => ({ ...prev, ...newData }));
    // For text inputs, we might want to debounce, but let's start with simple onBlur or direct for now
    // Actually, for better UX, we'll auto-save profile on blur if changed.
  };

  const updateSettings = async (newData: any) => {
    const updatedSettings = { ...settings, ...newData };
    setSettings(updatedSettings);
    
    if (updatedSettings.language !== settings.language) {
      // Need to change the URL locale for next-intl
      const newPathname = pathname;
      router.replace(newPathname, { locale: updatedSettings.language });
    }
    
    // Determine which table to sync
    if ('is_private' in newData || 'show_activity' in newData) {
      await saveToDB('privacy', newData);
      if ('is_private' in newData) await saveToDB('profile', newData);
    }
    if ('push_notifications' in newData) {
      await saveToDB('notifications', newData);
    }
    if ('usage_limit' in newData) {
      await saveToDB('usage', newData);
    }
    if ('language' in newData) {
      await saveToDB('profile', newData);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'media');
      formData.append('entityType', 'user');
      formData.append('entityId', user.id);

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const { data, error } = await res.json();
      if (error) throw new Error(error);

      const publicUrl = data.url;

      // Update both table and auth metadata
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id);
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));
      showToast(t('saveSuccess'), 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || t('saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'account', label: 'Centro Account', icon: '👤', description: 'Profilo, sicurezza, password' },
    { id: 'privacy', label: 'Privacy', icon: '🔒', description: 'Chi può vedere i tuoi contenuti' },
    { id: 'notifiche', label: 'Notifiche', icon: '🔔', description: 'Avvisi e messaggi' },
    { id: 'contenuti', label: 'Cosa vedi', icon: '✨', description: 'Preferiti, suggeriti' },
    { id: 'tempo', label: 'Tempo e attenzione', icon: '⌛', description: 'Gestione utilizzo' },
    { id: 'media', label: 'App e media', icon: '📱', description: 'Lingua, tema, qualità' },
    { id: 'abbonamento', label: 'Abbonamento', icon: '💎', description: 'Vibe Premium' },
    { id: 'info', label: 'Supporto e info', icon: 'ℹ️', description: 'Aiuto, termini e privacy' }
  ];

  if (loading) return <div className="p-20 text-center">Loading settings...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          <h1 className="text-2xl font-bold font-display vibe-gradient-text mb-6 pl-4">{t('title')}</h1>
          <div className="flex flex-col gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  router.replace(`${pathname}?tab=${tab.id}`);
                }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all ${
                  activeTab === tab.id 
                    ? 'bg-vibe-purple text-white shadow-lg shadow-vibe-purple/20' 
                    : 'text-vibe-text-secondary hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold leading-none mb-1">{tab.label}</span>
                  <span className={`text-[10px] font-medium leading-none ${activeTab === tab.id ? 'text-white/70' : 'text-vibe-text-secondary/60'}`}>
                    {tab.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 min-h-[600px] relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {activeTab === 'account' && (
                <div className="space-y-10">
                  <section>
                    <h2 className="text-sm font-bold text-vibe-text-secondary uppercase tracking-widest mb-6">Informazioni Personali</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      <div className="flex flex-col items-center gap-4 p-6 bg-white/5 rounded-2xl border border-white/5 relative group">
                        <Avatar size="xl" src={user?.user_metadata?.avatar_url || profileData.avatar_url} fallback={profileData.display_name[0] || 'U'} />
                        <label className="w-full">
                          <Button variant="secondary" size="sm" className="w-full cursor-pointer relative overflow-hidden">
                            {t('changePhoto', { fallback: 'Cambia Foto' })}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file);
                              }}
                            />
                          </Button>
                        </label>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-vibe-text-secondary uppercase ml-1">{t('username')}</label>
                          <input 
                            type="text" 
                            value={profileData.username} 
                            onChange={e => setProfileData({...profileData, username: e.target.value})}
                            onBlur={() => saveToDB('profile', { username: profileData.username })}
                            className="input-field" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-vibe-text-secondary uppercase ml-1">{t('fullName')}</label>
                          <input 
                            type="text" 
                            value={profileData.display_name} 
                            onChange={e => setProfileData({...profileData, display_name: e.target.value})}
                            onBlur={() => saveToDB('profile', { display_name: profileData.display_name })}
                            className="input-field" 
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 space-y-1.5">
                      <label className="text-[10px] font-bold text-vibe-text-secondary uppercase ml-1">Bio</label>
                      <textarea 
                        value={profileData.bio} 
                        onChange={e => setProfileData({...profileData, bio: e.target.value})}
                        onBlur={() => saveToDB('profile', { bio: profileData.bio })}
                        className="input-field min-h-[100px] py-3" 
                        placeholder="Raccontaci qualcosa di te..."
                      />
                    </div>
                  </section>

                  <section className="pt-6 border-t border-white/5">
                    <h2 className="text-sm font-bold text-vibe-text-secondary uppercase tracking-widest mb-6">Sicurezza e Accesso</h2>
                    <div className="space-y-3">
                      <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                        <div className="flex items-center gap-3">
                          <span>🔑</span>
                          <span className="text-sm font-bold">Cambia Password</span>
                        </div>
                        <span className="text-vibe-text-secondary">›</span>
                      </button>
                      <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                        <div className="flex items-center gap-3">
                          <span>📱</span>
                          <span className="text-sm font-bold">Autenticazione a due fattori (2FA)</span>
                        </div>
                        <span className="text-vibe-purple font-bold text-xs uppercase">Consigliato</span>
                      </button>
                      <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                        <div className="flex items-center gap-3">
                          <span>🕵️</span>
                          <span className="text-sm font-bold">Attività di Login</span>
                        </div>
                        <span className="text-vibe-text-secondary">›</span>
                      </button>
                    </div>
                  </section>

                  <section className="pt-6 border-t border-white/5">
                    <h2 className="text-sm font-bold text-vibe-text-secondary uppercase tracking-widest mb-6 font-display">Zona Pericolo</h2>
                    <div className="bg-red-500/5 rounded-2xl border border-red-500/10 p-6 space-y-4">
                      <div>
                        <h3 className="font-bold text-red-500 mb-1">Esporta i tuoi dati</h3>
                        <p className="text-xs text-vibe-text-secondary">Scarica una copia dei tuoi dati personali in formato JSON.</p>
                      </div>
                      <Button variant="outline" size="sm">Richiedi Archivio</Button>
                      <div className="pt-4 border-t border-red-500/10 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-red-500">Elimina l'account</h3>
                          <p className="text-xs text-vibe-text-secondary">Questa azione è permanente e distruttiva.</p>
                        </div>
                        <Button variant="ghost" className="text-red-500 hover:bg-red-500/10">Elimina</Button>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'abbonamento' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold border-b border-white/10 pb-4">Piano e Abbonamento</h2>
                  <SubscriptionManager />
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold border-b border-white/10 pb-4">{t('privacy')}</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold">{t('privateAccount')}</h3>
                        <p className="text-sm text-vibe-text-secondary">{t('privateDescription')}</p>
                      </div>
                      <Switch 
                        checked={settings.is_private} 
                        onChange={() => updateSettings({ is_private: !settings.is_private })} 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold">{t('showActivity')}</h3>
                        <p className="text-sm text-vibe-text-secondary">{t('activityDescription')}</p>
                      </div>
                      <Switch 
                        checked={settings.show_activity} 
                        onChange={() => updateSettings({ show_activity: !settings.show_activity })} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifiche' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-bold border-b border-white/5 pb-4">{t('notifications')}</h2>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <h3 className="font-bold text-sm">{t('pushNotifications')}</h3>
                      <p className="text-[10px] text-vibe-text-secondary tracking-wide uppercase mt-1">Avvisi sul dispositivo</p>
                    </div>
                    <Switch 
                      checked={settings.push_notifications} 
                      onChange={() => updateSettings({ push_notifications: !settings.push_notifications })} 
                    />
                  </div>
                  
                  <div className="pt-4 space-y-3">
                    <h3 className="text-xs font-bold text-vibe-text-secondary uppercase tracking-widest">Tipi di Notifica</h3>
                    {['Like', 'Commenti', 'Follower', 'Messaggi', 'Eventi'].map(item => (
                      <div key={item} className="flex items-center justify-between py-1 px-1">
                        <span className="text-sm font-medium">{item}</span>
                        <Switch checked={true} onChange={() => {}} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'contenuti' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-bold border-b border-white/5 pb-4">Cosa vedi</h2>
                  <div className="space-y-6">
                    <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
                      <div className="flex items-center gap-3">
                        <span>⭐</span>
                        <div className="text-left">
                          <span className="block text-sm font-bold">Preferiti</span>
                          <span className="block text-[10px] text-vibe-text-secondary uppercase">Gestisci gli account preferiti</span>
                        </div>
                      </div>
                      <span className="text-vibe-text-secondary">›</span>
                    </button>
                    <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
                      <div className="flex items-center gap-3">
                        <span>🚫</span>
                        <div className="text-left">
                          <span className="block text-sm font-bold">Nascosti</span>
                          <span className="block text-[10px] text-vibe-text-secondary uppercase">Parole e account nascosti</span>
                        </div>
                      </div>
                      <span className="text-vibe-text-secondary">›</span>
                    </button>
                    <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
                      <div className="flex items-center gap-3">
                        <span>🔍</span>
                        <div className="text-left">
                          <span className="block text-sm font-bold">Interessi</span>
                          <span className="block text-[10px] text-vibe-text-secondary uppercase">Gestisci le tue categorie</span>
                        </div>
                      </div>
                      <span className="text-vibe-text-secondary">›</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'tempo' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h2 className="text-xl font-bold">Tempo e attenzione</h2>
                    <span className="text-vibe-purple text-xs font-bold uppercase py-1 px-3 bg-vibe-purple/10 rounded-full">Oggi: {settings.daily_usage}m</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="p-6 bg-white/5 border-white/5 flex flex-col items-center text-center">
                      <span className="text-[10px] font-bold text-vibe-text-secondary uppercase tracking-tighter">Media Giornaliera</span>
                      <span className="text-4xl font-black text-vibe-cyan mt-2">{Math.round(settings.weekly_usage / 7)}</span>
                      <span className="text-[10px] font-medium text-vibe-text-secondary mt-1">Minuti al giorno</span>
                    </Card>
                    <Card className="p-6 bg-white/5 border-white/5 flex flex-col items-center text-center">
                      <span className="text-[10px] font-bold text-vibe-text-secondary uppercase tracking-tighter">Questa Settimana</span>
                      <span className="text-4xl font-black text-vibe-purple mt-2">{settings.weekly_usage}</span>
                      <span className="text-[10px] font-medium text-vibe-text-secondary mt-1">Minuti totali</span>
                    </Card>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">⏱️</span>
                      <h3 className="text-sm font-bold">Gestisci il tuo tempo</h3>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-vibe-text-secondary">Limite Giornaliero</label>
                        <select 
                          value={settings.usage_limit} 
                          onChange={e => updateSettings({ usage_limit: parseInt(e.target.value) })}
                          className="input-field py-3"
                        >
                          <option value="0">Nessun limite</option>
                          <option value="30">30 minuti</option>
                          <option value="60">1 ora</option>
                          <option value="120">2 ore</option>
                        </select>
                      </div>
                      <p className="text-[10px] text-vibe-text-secondary leading-relaxed">
                        Ti invieremo un promemoria quando avrai raggiunto il limite di tempo impostato per la giornata.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'media' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-bold border-b border-white/5 pb-4">App e media</h2>
                  
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-vibe-text-secondary uppercase tracking-widest">Lingua</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {locales.map(l => (
                          <button
                            key={l}
                            onClick={() => updateSettings({ language: l })}
                            className={`px-3 py-3 rounded-xl text-xs font-bold border transition-all ${
                              settings.language === l 
                                ? 'bg-vibe-purple border-vibe-purple text-white shadow-lg' 
                                : 'border-white/10 text-vibe-text-secondary hover:bg-white/5'
                            }`}
                          >
                            {localeNames[l]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <h3 className="text-xs font-bold text-vibe-text-secondary uppercase tracking-widest">Tema e Aspetto</h3>
                      <Link 
                        href="/settings/theme"
                        className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span>🌙</span>
                          <span className="text-sm font-bold">Personalizzazione Tema</span>
                        </div>
                        <span className="text-vibe-text-secondary">›</span>
                      </Link>
                    </div>

                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <h3 className="text-xs font-bold text-vibe-text-secondary uppercase tracking-widest">Qualità Media</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="block text-sm font-medium">Caricamento in alta qualità</span>
                          <span className="block text-[10px] text-vibe-text-secondary">Usa più dati ma migliora la risoluzione</span>
                        </div>
                        <Switch checked={true} onChange={() => {}} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'info' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-bold border-b border-white/5 pb-4">Supporto e info</h2>
                  <div className="space-y-3">
                    {['Centro assistenza', 'Privacy policy', 'Termini di servizio', 'Crediti'].map(item => (
                      <button key={item} className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
                        <span className="text-sm font-bold">{item}</span>
                        <span className="text-vibe-text-secondary">›</span>
                      </button>
                    ))}
                  </div>
                  <div className="text-center pt-10">
                    <p className="text-xs text-vibe-text-secondary opacity-50">Vibemeet Platform v3.0.0-alpha</p>
                    <p className="text-[10px] text-vibe-text-secondary opacity-30 mt-1 uppercase tracking-tighter">Powered by Antigravity Infrastructure</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Save Status Spinner (Subtle) */}
          <div className="absolute top-6 right-8">
            {isSaving && (
              <div className="flex items-center gap-2 text-vibe-text-secondary text-xs">
                <div className="w-3 h-3 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin"></div>
                {t('saving', { fallback: 'Salvataggio...' })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
