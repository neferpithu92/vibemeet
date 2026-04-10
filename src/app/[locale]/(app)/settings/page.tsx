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
import { SettingRow } from '@/components/ui/SettingRow';
import { AccountCenter } from '@/components/settings/AccountCenter';
import { 
  ChevronLeft, 
  User, 
  Lock, 
  Bell, 
  Eye, 
  Hourglass, 
  Globe, 
  Palette, 
  Gem, 
  Info, 
  LogOut,
  Moon,
  Shield,
  Trash2,
  Database,
  HelpCircle
} from 'lucide-react';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<string | null>(searchParams.get('tab'));
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
    location_sharing: true
  });

  const [profileData, setProfileData] = useState<any>({
    username: '',
    display_name: '',
    email: '',
    bio: '',
    avatar_url: ''
  });

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }
      setUser(authUser);

      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();

      if (profile) {
        setProfileData({
          username: profile.username || '',
          display_name: profile.display_name || '',
          email: authUser.email || '',
          bio: profile.bio || '',
          avatar_url: profile.avatar_url || ''
        });
        setSettings((prev: any) => ({
          ...prev,
          language: profile.language || 'it',
          is_private: profile.account_type === 'private'
        }));
      }

      const { data: priv } = await supabase.from('privacy_settings').select('*').eq('user_id', authUser.id).single();
      const { data: notif } = await supabase.from('notification_settings').select('*').eq('user_id', authUser.id).single();
      const { data: usage } = await supabase.from('usage_stats').select('*').eq('user_id', authUser.id).order('date', { ascending: false }).limit(7);

      if (priv) {
        setSettings((prev: any) => ({
          ...prev,
          show_activity: priv.show_activity_status,
          anon_mode: priv.anon_mode || false
        }));
      }
      if (notif) {
        setSettings((prev: any) => ({ ...prev, push_notifications: notif.push_enabled }));
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

  useEffect(() => {
    setActiveTab(searchParams.get('tab'));
  }, [searchParams]);

  const saveToDB = async (type: string, newData: any) => {
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
        await supabase.from('privacy_settings').upsert({
          user_id: user.id,
          show_activity_status: newData.show_activity ?? settings.show_activity,
          account_type: (newData.is_private ?? settings.is_private) ? 'private' : 'public'
        });
      } else if (type === 'notifications') {
        await supabase.from('notification_settings').upsert({
          user_id: user.id,
          push_enabled: newData.push_notifications ?? settings.push_notifications
        });
      }
      showToast(t('saveSuccess'), 'success');
    } catch (err) {
      showToast(t('saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = async (newData: any) => {
    const updatedSettings = { ...settings, ...newData };
    setSettings(updatedSettings);
    
    if (updatedSettings.language !== settings.language) {
      router.replace(pathname, { locale: updatedSettings.language });
    }
    
    if ('is_private' in newData || 'show_activity' in newData) await saveToDB('privacy', newData);
    if ('push_notifications' in newData) await saveToDB('notifications', newData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navigateToTab = (id: string | null) => {
    setActiveTab(id);
    if (id) {
      router.push(`${pathname}?tab=${id}`);
    } else {
      router.push(pathname);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-vibe-text-secondary">Caricamento impostazioni...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 min-h-screen">
      <AnimatePresence mode="wait">
        {!activeTab ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4 mb-4">
               <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/5">
                 <ChevronLeft className="w-6 h-6" />
               </button>
               <h1 className="text-2xl font-black uppercase tracking-tighter vibe-gradient-text">Impostazioni</h1>
            </div>

            <AccountCenter user={profileData} />

            {/* Sezione: Cosa vedi */}
            <div className="space-y-1">
               <h2 className="text-[10px] font-bold text-vibe-text-secondary uppercase tracking-widest pl-2 mb-2">Preferenze e Contenuti</h2>
               <SettingRow icon={<Bell className="w-5 h-5 text-vibe-cyan" />} label="Notifiche" description="Avvisi, email, messaggi" href="/settings?tab=notifiche" value={settings.push_notifications ? 'Attive' : 'Disattivate'} />
               <SettingRow icon={<Hourglass className="w-5 h-5 text-orange-400" />} label="Tempo trascorso" description="Gestisci i tuoi limiti giornalieri" href="/settings?tab=tempo" value={`${settings.daily_usage}m`} />
               <SettingRow icon={<Lock className="w-5 h-5 text-vibe-purple" />} label="Privacy" description="Chi può vedere i tuoi contenuti" href="/settings?tab=privacy" value={settings.is_private ? 'Privato' : 'Pubblico'} />
            </div>

            {/* Sezione: App e Media */}
            <div className="space-y-1 pt-4">
               <h2 className="text-[10px] font-bold text-vibe-text-secondary uppercase tracking-widest pl-2 mb-2">Visualizzazione</h2>
               <SettingRow icon={<Palette className="w-5 h-5 text-vibe-pink" />} label="Tema" description="Colori, sfondi, aspetto" href="/settings/theme" value="Neon" />
               <SettingRow icon={<Globe className="w-5 h-5 text-blue-400" />} label="Lingua" description="Cambia lingua dell'interfaccia" href="/settings?tab=media" value={localeNames[settings.language as keyof typeof localeNames]} />
            </div>

            {/* Sezione: Monetizzazione */}
            <div className="space-y-1 pt-4">
               <h2 className="text-[10px] font-bold text-vibe-text-secondary uppercase tracking-widest pl-2 mb-2">Business</h2>
               <SettingRow icon={<Gem className="w-5 h-5 text-amber-300" />} label="Abbonamento" description="Gestisci Vibe Premium" href="/settings?tab=abbonamento" value="Pro" />
            </div>

            {/* Sezione: Supporto */}
            <div className="space-y-1 pt-4">
               <h2 className="text-[10px] font-bold text-vibe-text-secondary uppercase tracking-widest pl-2 mb-2">Altro</h2>
               <SettingRow icon={<HelpCircle className="w-5 h-5 text-gray-400" />} label="Aiuto e Assistenza" description="Centro assistenza e FAQ" href="/settings?tab=info" />
               <SettingRow icon={<Shield className="w-5 h-5 text-gray-400" />} label="Privacy Policy" description="Dati e termini di servizio" href="/settings?tab=info" />
               <SettingRow icon={<LogOut className="w-5 h-5 text-red-500" />} label="Esci" description="Termina la sessione corrente" onClick={handleLogout} dangerous />
            </div>

            <div className="py-12 text-center opacity-30">
               <p className="text-[10px] uppercase font-black tracking-widest text-vibe-text-secondary">Vibe Platform v4.0.0 Enterprise</p>
               <p className="text-[9px] mt-1 text-vibe-text-secondary">Powered by Antigravity Core 🦾</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="subpage"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Header Sottopagina */}
            <div className="flex items-center gap-4 py-2">
               <button onClick={() => navigateToTab(null)} className="p-2 -ml-2 rounded-full hover:bg-white/5 active:scale-90 transition-all">
                 <ChevronLeft className="w-6 h-6 text-white" />
               </button>
               <h2 className="text-xl font-black uppercase tracking-tighter">{activeTab}</h2>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 min-h-[400px]">
              {activeTab === 'account' && (
                <div className="space-y-8">
                   <div className="space-y-4">
                      <h3 className="text-xs font-bold text-vibe-text-secondary uppercase tracking-widest">Dettagli Profilo</h3>
                      <input type="text" value={profileData.display_name} onChange={e => setProfileData({...profileData, display_name: e.target.value})} onBlur={() => saveToDB('profile', {})} className="input-field" placeholder="Nome Visualizzato" />
                      <input type="text" value={profileData.username} onChange={e => setProfileData({...profileData, username: e.target.value})} onBlur={() => saveToDB('profile', {})} className="input-field" placeholder="Username" />
                      <textarea value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} onBlur={() => saveToDB('profile', {})} className="input-field min-h-[100px]" placeholder="Bio..." />
                   </div>
                   <div className="pt-6 border-t border-white/10 space-y-4">
                      <h3 className="text-xs font-bold text-vibe-text-secondary uppercase tracking-widest">Sicurezza</h3>
                      <Button variant="secondary" className="w-full">Cambia Password</Button>
                      <Button variant="outline" className="w-full">Attiva 2FA</Button>
                   </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                     <div>
                       <h4 className="font-bold">Account Privato</h4>
                       <p className="text-xs text-vibe-text-secondary">Solo chi approvi può vedere i tuoi post</p>
                     </div>
                     <Switch checked={settings.is_private} onChange={() => updateSettings({ is_private: !settings.is_private })} />
                   </div>
                   <div className="flex items-center justify-between">
                     <div>
                       <h4 className="font-bold">Status Attività</h4>
                       <p className="text-xs text-vibe-text-secondary">Mostra quando sei online</p>
                     </div>
                     <Switch checked={settings.show_activity} onChange={() => updateSettings({ show_activity: !settings.show_activity })} />
                   </div>
                </div>
              )}

              {activeTab === 'notifiche' && (
                <div className="space-y-6">
                   <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                     <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-vibe-cyan" />
                        <span className="font-bold">Notifiche Push</span>
                     </div>
                     <Switch checked={settings.push_notifications} onChange={() => updateSettings({ push_notifications: !settings.push_notifications })} />
                   </div>
                   <div className="space-y-4 pt-4">
                      <h4 className="text-xs font-bold text-vibe-text-secondary uppercase tracking-widest">Personalizza</h4>
                      {['Messaggi', 'Nuovi Follower', 'Mi Piace', 'Eventi Vicini'].map(it => (
                        <div key={it} className="flex items-center justify-between">
                           <span className="text-sm font-medium">{it}</span>
                           <Switch checked={true} onChange={() => {}} />
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {activeTab === 'abbonamento' && <SubscriptionManager />}

              {activeTab === 'media' && (
                <div className="space-y-6">
                   <h4 className="text-xs font-bold text-vibe-text-secondary uppercase tracking-widest">Lingua App</h4>
                   <div className="grid grid-cols-2 gap-2">
                     {locales.map(l => (
                       <button
                         key={l}
                         onClick={() => updateSettings({ language: l })}
                         className={`px-4 py-3 rounded-2xl border transition-all text-sm font-bold ${
                           settings.language === l ? 'bg-vibe-purple border-vibe-purple text-white' : 'border-white/10 hover:bg-white/5 text-vibe-text-secondary'
                         }`}
                       >
                         {localeNames[l]}
                       </button>
                     ))}
                   </div>
                </div>
              )}

              {activeTab === 'tempo' && (
                <div className="space-y-6 text-center">
                   <div className="w-24 h-24 rounded-full border-4 border-vibe-purple flex items-center justify-center mx-auto mb-4 bg-vibe-purple/10">
                      <span className="text-2xl font-black">{settings.daily_usage}m</span>
                   </div>
                   <h3 className="font-bold">Utilizzo Oggi</h3>
                   <p className="text-xs text-vibe-text-secondary">Il tuo limite giornaliero è {settings.usage_limit > 0 ? `${settings.usage_limit}m` : 'Illimitato'}</p>
                   <div className="pt-6">
                      <label className="text-xs font-bold uppercase block mb-2">Imposta Limite</label>
                      <select value={settings.usage_limit} onChange={e => updateSettings({ usage_limit: parseInt(e.target.value) })} className="input-field">
                         <option value="0">Nessun Limite</option>
                         <option value="30">30 Minuti</option>
                         <option value="60">1 Ora</option>
                         <option value="120">2 Ore</option>
                      </select>
                   </div>
                </div>
              )}

              {isSaving && (
                <div className="flex items-center justify-center gap-2 mt-8 text-vibe-text-secondary text-[10px] animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-vibe-purple animate-bounce" />
                  Sincronizzazione Cloud in corso...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
