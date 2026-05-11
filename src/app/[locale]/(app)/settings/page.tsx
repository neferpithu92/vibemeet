'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/lib/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Switch } from '@/components/ui/Switch';
import { locales, localeNames } from '@/lib/i18n/config';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  ChevronLeft, Bell, Lock, Hourglass, Globe, Palette, Gem, LogOut,
  HelpCircle, Shield, User, ChevronRight, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SubscriptionManager = dynamic(() => import('@/components/profile/SubscriptionManager').then(m => m.SubscriptionManager), { ssr: false });
const AccountCenter = dynamic(() => import('@/components/settings/AccountCenter').then(m => m.AccountCenter), { ssr: false });

type TabId = 'account' | 'privacy' | 'notifiche' | 'tempo' | 'media' | 'abbonamento' | 'tema' | 'info';

const TABS = [
  { id: 'account', icon: User, label: 'Centro gestione account' },
  { id: 'notifiche', icon: Bell, label: 'Notifiche' },
  { id: 'tempo', icon: Hourglass, label: 'Tempo di utilizzo' },
  { id: 'privacy', icon: Lock, label: 'Privacy dell\'account' },
  { id: 'media', icon: Globe, label: 'Lingua' },
  { id: 'tema', icon: Palette, label: 'Tema' },
  { id: 'abbonamento', icon: Gem, label: 'Abbonamento' },
  { id: 'info', icon: HelpCircle, label: 'Assistenza e info' },
];

export default function SettingsPage() {
  const t = useTranslations('settings');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { showToast } = useToast();
  
  const initialTab = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId | null>(initialTab);
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState<any>({
    language: 'it', is_private: false, show_activity: true, push_notifications: true,
    daily_usage: 0, usage_limit: 0
  });

  const [profileData, setProfileData] = useState({
    username: '', display_name: '', bio: '', avatar_url: '', email: ''
  });

  useEffect(() => {
    setActiveTab((searchParams.get('tab') as TabId) || null);
  }, [searchParams]);

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return router.push('/login');
      setUser(authUser);

      const [profileRes, privRes, notifRes, usageRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', authUser.id).single(),
        supabase.from('privacy_settings').select('*').eq('user_id', authUser.id).maybeSingle(),
        supabase.from('notification_settings').select('*').eq('user_id', authUser.id).maybeSingle(),
        supabase.from('usage_stats').select('*').eq('user_id', authUser.id).order('date', { ascending: false }).limit(1).maybeSingle()
      ]);

      if (profileRes.data) {
        setProfileData({
          username: profileRes.data.username || '',
          display_name: profileRes.data.display_name || '',
          bio: profileRes.data.bio || '',
          avatar_url: profileRes.data.avatar_url || '',
          email: authUser.email || ''
        });
        setSettings((s: any) => ({ ...s, language: profileRes.data!.language || 'it', is_private: profileRes.data!.account_type === 'private' }));
      }
      if (privRes.data) setSettings((s: any) => ({ ...s, show_activity: privRes.data!.show_activity_status }));
      if (notifRes.data) setSettings((s: any) => ({ ...s, push_notifications: notifRes.data!.push_enabled }));
      if (usageRes.data) setSettings((s: any) => ({ ...s, daily_usage: usageRes.data!.minutes_used || 0, usage_limit: usageRes.data!.daily_limit_minutes || 0 }));
      
      setLoading(false);
    }
    loadData();
  }, [supabase, router]);

  const saveToDB = async (type: string, newData: any) => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (type === 'profile') {
        await supabase.from('users').update({
          username: newData.username ?? profileData.username,
          display_name: newData.display_name ?? profileData.display_name,
          bio: newData.bio ?? profileData.bio,
          language: newData.language ?? settings.language,
          account_type: (newData.is_private ?? settings.is_private) ? 'private' : 'public'
        }).eq('id', user.id);
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
      showToast('Impostazioni salvate', 'success');
    } catch {
      showToast('Errore durante il salvataggio', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = async (newData: any) => {
    const next = { ...settings, ...newData };
    setSettings(next);
    if (newData.language) router.replace(pathname, { locale: newData.language });
    if ('is_private' in newData || 'show_activity' in newData) await saveToDB('privacy', newData);
    if ('push_notifications' in newData) await saveToDB('notifications', newData);
  };

  const navigateTo = (id: TabId | null) => {
    if (id) router.push(`${pathname}?tab=${id}`);
    else router.push(pathname);
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-vibe-text-secondary">Caricamento...</div>;

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Modifica profilo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-vibe-text-secondary mb-1">Nome</label>
                <input type="text" value={profileData.display_name} onChange={e => setProfileData({...profileData, display_name: e.target.value})} onBlur={() => saveToDB('profile', {})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-vibe-purple transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-vibe-text-secondary mb-1">Nome utente</label>
                <input type="text" value={profileData.username} onChange={e => setProfileData({...profileData, username: e.target.value})} onBlur={() => saveToDB('profile', {})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-vibe-purple transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-vibe-text-secondary mb-1">Bio</label>
                <textarea value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} onBlur={() => saveToDB('profile', {})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-vibe-purple transition-colors min-h-[100px]" />
              </div>
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Privacy dell'account</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div>
                  <h4 className="font-medium">Account Privato</h4>
                  <p className="text-sm text-vibe-text-secondary">Solo chi approvi può vedere i tuoi post</p>
                </div>
                <Switch checked={settings.is_private} onChange={() => updateSettings({ is_private: !settings.is_private })} />
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div>
                  <h4 className="font-medium">Stato di attività</h4>
                  <p className="text-sm text-vibe-text-secondary">Permetti agli altri di vedere quando sei online</p>
                </div>
                <Switch checked={settings.show_activity} onChange={() => updateSettings({ show_activity: !settings.show_activity })} />
              </div>
            </div>
          </div>
        );
      case 'notifiche':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Notifiche</h2>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div>
                <h4 className="font-medium">Notifiche Push</h4>
                <p className="text-sm text-vibe-text-secondary">Ricevi avvisi sul dispositivo</p>
              </div>
              <Switch checked={settings.push_notifications} onChange={() => updateSettings({ push_notifications: !settings.push_notifications })} />
            </div>
          </div>
        );
      case 'media':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Lingua</h2>
            <div className="space-y-2">
              {locales.map(l => (
                <button
                  key={l}
                  onClick={() => updateSettings({ language: l })}
                  className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors"
                >
                  <span className={settings.language === l ? 'font-bold' : ''}>{localeNames[l]}</span>
                  {settings.language === l && <Check className="w-5 h-5 text-vibe-purple" />}
                </button>
              ))}
            </div>
          </div>
        );
      case 'tempo':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Tempo di utilizzo</h2>
            <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/5">
              <div className="text-4xl font-black text-vibe-purple mb-2">{settings.daily_usage}m</div>
              <p className="text-vibe-text-secondary">Tempo trascorso oggi</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-vibe-text-secondary mb-2">Limite giornaliero</label>
              <select 
                value={settings.usage_limit} 
                onChange={e => updateSettings({ usage_limit: parseInt(e.target.value) })} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-vibe-purple transition-colors"
              >
                <option value="0">Nessun limite</option>
                <option value="15">15 minuti</option>
                <option value="30">30 minuti</option>
                <option value="60">1 ora</option>
                <option value="120">2 ore</option>
              </select>
            </div>
          </div>
        );
      case 'abbonamento':
        return <SubscriptionManager />;
      case 'tema':
        return (
           <div className="space-y-6">
             <h2 className="text-2xl font-bold mb-6">Tema</h2>
             <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                <span>Modalità Scura</span>
                <Switch checked={true} onChange={() => {}} />
             </div>
           </div>
        );
      case 'info':
        return (
           <div className="space-y-6">
             <h2 className="text-2xl font-bold mb-6">Assistenza e info</h2>
             <div className="space-y-2">
               <button className="w-full text-left p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">Centro assistenza</button>
               <button className="w-full text-left p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">Privacy Policy</button>
               <button className="w-full text-left p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">Termini di servizio</button>
             </div>
           </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-vibe-text-secondary">
             <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
               <Shield className="w-10 h-10 opacity-50" />
             </div>
             <p>Seleziona un'opzione dal menu per visualizzare le impostazioni</p>
          </div>
        );
    }
  };

  return (
    <div className="flex max-w-5xl mx-auto min-h-[calc(100vh-80px)] bg-vibe-dark md:py-8 px-0 md:px-4">
      {/* Sidebar (Nascosta su mobile se c'è un tab attivo) */}
      <div className={cn(
        "w-full md:w-80 flex-shrink-0 border-r border-white/10 flex flex-col transition-all",
        activeTab ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 md:p-6 pb-2">
          <h1 className="text-2xl font-bold">Impostazioni</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 pb-20 md:pb-4 space-y-1">
          <div className="p-2 mb-2">
             <AccountCenter user={profileData} />
          </div>

          <div className="px-3 pb-2 pt-4">
             <span className="text-xs font-semibold text-vibe-text-secondary uppercase tracking-wider">Preferenze</span>
          </div>
          
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => navigateTo(tab.id as TabId)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl transition-all",
                activeTab === tab.id 
                  ? "bg-white/10 font-medium" 
                  : "hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-4">
                <tab.icon className={cn("w-6 h-6", activeTab === tab.id ? "text-vibe-purple" : "text-vibe-text-secondary")} />
                <span>{tab.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-vibe-text-secondary opacity-50" />
            </button>
          ))}

          <div className="mt-8 px-2">
            <button 
              onClick={() => {
                supabase.auth.signOut();
                router.push('/login');
              }}
              className="w-full flex items-center gap-4 p-4 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
            >
              <LogOut className="w-6 h-6" />
              <span className="font-medium">Esci</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area (Visibile su mobile solo se c'è un tab attivo) */}
      <div className={cn(
        "flex-1 flex flex-col bg-vibe-dark transition-all min-h-screen md:min-h-0",
        !activeTab ? "hidden md:flex" : "flex"
      )}>
        {/* Mobile Header per il back */}
        <div className="md:hidden flex items-center gap-4 p-4 border-b border-white/10 sticky top-0 bg-vibe-dark z-10">
          <button onClick={() => navigateTo(null)} className="p-2 -ml-2 hover:bg-white/10 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="font-bold text-lg">{TABS.find(t => t.id === activeTab)?.label}</h2>
          {isSaving && <div className="ml-auto w-4 h-4 rounded-full border-2 border-vibe-purple border-t-transparent animate-spin" />}
        </div>
        
        {/* Contenuto Tab */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 pb-24 md:pb-10 relative">
          {/* Header Desktop (opzionale) */}
          <div className="hidden md:flex absolute top-10 right-10">
            {isSaving && <div className="w-5 h-5 rounded-full border-2 border-vibe-purple border-t-transparent animate-spin" />}
          </div>
          
          <div className="max-w-2xl mx-auto w-full">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
