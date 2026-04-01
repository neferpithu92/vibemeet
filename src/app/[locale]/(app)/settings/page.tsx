'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/lib/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Avatar } from '@/components/ui/Avatar';
import { locales, localeNames } from '@/lib/i18n/config';
import { SubscriptionManager } from '@/components/profile/SubscriptionManager';

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

  const [profileData, setProfileData] = useState({
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

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // 1. Update Profile
      await supabase.from('users').update({
        username: profileData.username,
        display_name: profileData.display_name,
        bio: profileData.bio,
        language: settings.language,
        account_type: settings.is_private ? 'private' : 'public'
      }).eq('id', user.id);

      // 2. Update Privacy
      await supabase.from('privacy_settings').upsert({
        user_id: user.id,
        show_activity_status: settings.show_activity,
        account_type: settings.is_private ? 'private' : 'public'
      });

      // 3. Update Notifications
      await supabase.from('notification_settings').upsert({
        user_id: user.id,
        push_enabled: settings.push_notifications
      });

      // 4. Update Usage Limit
      await supabase.from('usage_stats').upsert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        daily_limit_minutes: settings.usage_limit
      }, { onConflict: 'user_id,date' });

      alert(t('saveSuccess'));
    } catch (err) {
      console.error(err);
      alert(t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profilo', label: t('profile'), icon: '👤' },
    { id: 'abbonamento', label: 'Abbonamento', icon: '💎' },
    { id: 'sicurezza', label: t('security'), icon: '🔐' },
    { id: 'privacy', label: t('privacy'), icon: '🔒' },
    { id: 'notifiche', label: t('notifications'), icon: '🔔' },
    { id: 'uso', label: 'Uso App', icon: '📊' },
    { id: 'account', label: 'Account', icon: '⚙️' }
  ];

  if (loading) return <div className="p-20 text-center">Loading settings...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          <h1 className="text-2xl font-bold font-display vibe-gradient-text mb-6">{t('title')}</h1>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                router.replace(`${pathname}?tab=${tab.id}`);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-vibe-purple text-white shadow-lg shadow-vibe-purple/20' 
                  : 'text-vibe-text-secondary hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
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
              {activeTab === 'profilo' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold border-b border-white/10 pb-4">Impostazioni Profilo</h2>
                  <div className="flex items-center gap-6">
                    <Avatar size="xl" src={user?.user_metadata?.avatar_url} fallback={profileData.display_name[0] || 'U'} />
                    <Button variant="secondary" size="sm">Cambia Foto</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-vibe-text-secondary uppercase">{t('username')}</label>
                      <input 
                        type="text" 
                        value={profileData.username} 
                        onChange={e => setProfileData({...profileData, username: e.target.value})}
                        className="input-field" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-vibe-text-secondary uppercase">{t('fullName')}</label>
                      <input 
                        type="text" 
                        value={profileData.display_name} 
                        onChange={e => setProfileData({...profileData, display_name: e.target.value})}
                        className="input-field" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-vibe-text-secondary uppercase">Bio</label>
                    <textarea 
                      value={profileData.bio} 
                      onChange={e => setProfileData({...profileData, bio: e.target.value})}
                      className="input-field min-h-[100px]" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-vibe-text-secondary uppercase">{t('language')}</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {locales.map(l => (
                        <button
                          key={l}
                          onClick={() => setSettings({...settings, language: l})}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                            settings.language === l 
                              ? 'bg-vibe-purple border-vibe-purple text-white' 
                              : 'border-white/10 text-vibe-text-secondary hover:bg-white/5'
                          }`}
                        >
                          {localeNames[l]}
                        </button>
                      ))}
                    </div>
                  </div>
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
                        onChange={() => setSettings({...settings, is_private: !settings.is_private})} 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold">{t('showActivity')}</h3>
                        <p className="text-sm text-vibe-text-secondary">{t('activityDescription')}</p>
                      </div>
                      <Switch 
                        checked={settings.show_activity} 
                        onChange={() => setSettings({...settings, show_activity: !settings.show_activity})} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifiche' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold border-b border-white/10 pb-4">{t('notifications')}</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">{t('pushNotifications')}</h3>
                      <p className="text-sm text-vibe-text-secondary">Ricevi avvisi per like, commenti e messaggi.</p>
                    </div>
                    <Switch 
                      checked={settings.push_notifications} 
                      onChange={() => setSettings({...settings, push_notifications: !settings.push_notifications})} 
                    />
                  </div>
                </div>
              )}

              {activeTab === 'uso' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold border-b border-white/10 pb-4">Statistiche di Utilizzo</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="p-4 bg-white/5 flex flex-col items-center">
                      <span className="text-xs font-bold text-vibe-text-secondary uppercase">Giornaliero</span>
                      <span className="text-3xl font-bold text-vibe-cyan mt-1">{settings.daily_usage} min</span>
                    </Card>
                    <Card className="p-4 bg-white/5 flex flex-col items-center">
                      <span className="text-xs font-bold text-vibe-text-secondary uppercase">Settimanale</span>
                      <span className="text-3xl font-bold text-vibe-purple mt-1">{settings.weekly_usage} min</span>
                    </Card>
                  </div>
                  <div className="space-y-2 pt-4">
                    <label className="text-sm font-bold">Imposta Limite Giornaliero</label>
                    <select 
                      value={settings.usage_limit} 
                      onChange={e => setSettings({...settings, usage_limit: parseInt(e.target.value)})}
                      className="input-field"
                    >
                      <option value="0">Nessun limite</option>
                      <option value="30">30 minuti</option>
                      <option value="60">1 ora</option>
                      <option value="120">2 ore</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold border-b border-white/10 pb-4">Gestione Account</h2>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <h3 className="font-bold text-sm mb-1">Esporta Dati (GDPR)</h3>
                      <p className="text-xs text-vibe-text-secondary mb-3">Scarica una copia dei tuoi dati personali in formato JSON.</p>
                      <Button variant="outline" size="sm">Richiedi Archivio</Button>
                    </div>
                    <div className="pt-4 border-t border-white/10">
                      <Button variant="ghost" className="text-red-500 hover:bg-red-500/10 w-full justify-start">
                        Elimina permanentemente l'account
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Save Button Overlay */}
          <div className="sticky bottom-0 mt-12 bg-vibe-dark/80 backdrop-blur-md p-4 -mx-8 -mb-8 border-t border-white/10 flex justify-end">
            <Button 
              onClick={handleSave} 
              isLoading={isSaving} 
              disabled={isSaving}
              className="px-8"
            >
              {t('save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
