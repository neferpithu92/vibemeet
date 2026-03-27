'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { createClient } from '@/lib/supabase/client';
import { SubscriptionManager } from '@/components/profile/SubscriptionManager';
import { useRouter } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';

interface SettingsPageProps {
  initialSettings: any;
  user: any;
}

/**
 * Pagina Settings — Permette all'utente di gestire account, privacy e notifiche.
 */
export default function SettingsPage({ initialSettings, user }: SettingsPageProps) {
  const t = useTranslations('settings');
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState(initialSettings || {
    is_private: false,
    show_activity: true,
    is_paused: false,
    deletion_requested_at: null,
    allow_messages: 'everyone',
    push_likes: true,
    push_comments: true,
    push_messages: true,
    push_events: true,
    push_safety: true,
    theme: 'dark',
    language: 'it',
    location_radius: '500m',
    event_anon_mode: false,
    checkin_visibility: 'followers'
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [username, setUsername] = useState(user?.username || '');
  const [fullName, setFullName] = useState(user?.full_name || user?.display_name || '');

  const handleToggle = (key: string) => {
    setSettings((prev: Record<string, any>) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await supabase.from('user_settings').update({
        is_private: settings.is_private,
        show_activity: settings.show_activity,
        allow_messages: settings.allow_messages,
        push_likes: settings.push_likes,
        push_comments: settings.push_comments,
        push_messages: settings.push_messages,
        push_events: settings.push_events,
        push_safety: settings.push_safety,
        theme: settings.theme,
        language: settings.language,
        location_radius: settings.location_radius,
        event_anon_mode: settings.event_anon_mode,
        checkin_visibility: settings.checkin_visibility
      }).eq('user_id', user?.id);

      await supabase.from('users').update({
        account_type: settings.is_private ? 'private' : 'public',
        language: settings.language,
        username: username || undefined,
        display_name: fullName || undefined,
      }).eq('id', user?.id);

      alert(t('saveSuccess'));
    } catch (e) {
      console.error(e);
      alert(t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const { data } = await supabase.storage
      .from('avatars')
      .upload(`${user?.id}/avatar.webp`, file, { upsert: true });
    
    if (data) {
      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(data.path);
      await supabase.from('users').update({ avatar_url: publicData.publicUrl }).eq('id', user?.id);
      alert(t('avatarUploaded'));
    }
  };

  const handleChangeEmail = async () => {
    const { error } = await supabase.auth.updateUser({ email });
    if (!error) alert(t('emailConfirm'));
  };

  const handleChangePassword = async () => {
    if (!password) return;
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) alert(t('passwordSuccess'));
  };

  const handleEnable2FA = async () => {
    const { data } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (data) {
      setQrCode(data.totp.qr_code);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      await supabase.from('users').update({ 
        deletion_requested_at: new Date().toISOString()
      }).eq('id', user?.id);
      
      alert(t('deleteRequested')); // "Richiesta di eliminazione inviata. Hai 30 giorni per recuperarlo."
      await supabase.auth.signOut();
      router.push('/');
    } catch (e) {
      console.error(e);
    }
  };

  const handlePauseAccount = async () => {
    const newPausedState = !settings.is_paused;
    const { error } = await supabase.from('users').update({ 
      is_paused: newPausedState 
    }).eq('id', user?.id);

    if (!error) {
      setSettings((prev: any) => ({ ...prev, is_paused: newPausedState }));
      alert(newPausedState ? t('accountPaused') : t('accountResumed'));
      if (newPausedState) {
        await supabase.auth.signOut();
        router.push('/');
      }
    }
  };

  const handleReactivate = async () => {
    const { error } = await supabase.from('users').update({ 
      deletion_requested_at: null 
    }).eq('id', user?.id);
    if (!error) {
      alert(t('accountReactivated'));
      window.location.reload();
    }
  };

  const tabs = [
    { id: 'profile', label: t('profile') },
    { id: 'subscription', label: t('subscription', { fallback: 'Abbonamento' }) },
    { id: 'privacy', label: t('privacy') },
    { id: 'notifications', label: t('notifications') },
    { id: 'security', label: t('security') },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0">
        <h1 className="text-2xl font-display font-bold mb-6">{t('title')}</h1>
        <div className="flex bg-white/5 md:bg-transparent rounded-xl p-1 md:p-0 overflow-x-auto md:flex-col gap-1 md:gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium rounded-lg whitespace-nowrap md:whitespace-normal text-left transition-colors ${
                activeTab === tab.id 
                  ? 'bg-vibe-purple text-white' 
                  : 'text-vibe-text-secondary hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl p-6">
        
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-4">{t('editProfile')}</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="text-xs text-vibe-text-secondary font-bold uppercase mb-1 block">{t('avatar')}</label>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="input-field py-2" />
              </div>
              <div>
                <label className="text-xs text-vibe-text-secondary font-bold uppercase mb-1 block">{t('username')}</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-field py-2" />
              </div>
              <div>
                <label className="text-xs text-vibe-text-secondary font-bold uppercase mb-1 block">{t('fullName')}</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field py-2" />
              </div>
              <div>
                <label className="text-xs text-vibe-text-secondary font-bold uppercase mb-1 block">{t('language')}</label>
                <select value={settings.language} onChange={e => setSettings((prev: Record<string, any>) => ({ ...prev, language: e.target.value }))} className="input-field py-2">
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                  <option value="rm">Rumantsch</option>
                </select>
              </div>

              <div className="pt-4 mt-6 border-t border-white/10">
                <Button 
                  onClick={() => router.push('/settings/theme')}
                  variant="outline" 
                  className="w-full justify-between"
                >
                  🎨 {t('theme')}
                  <span>→</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-4">{t('subscription', { fallback: 'Abbonamento' })}</h2>
            <SubscriptionManager />
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-4">{t('privacySafeHome')}</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-vibe-text">{t('privateAccount')}</h3>
                  <p className="text-xs text-vibe-text-secondary mt-1">
                    {t('privateDescription')}
                  </p>
                </div>
                <Switch checked={settings.is_private} onChange={() => handleToggle('is_private')} />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-vibe-text">{t('showActivity')}</h3>
                  <p className="text-xs text-vibe-text-secondary mt-1">
                    {t('activityDescription')}
                  </p>
                </div>
                <Switch checked={settings.show_activity} onChange={() => handleToggle('show_activity')} />
              </div>

              <div className="pt-4 border-t border-white/10 space-y-6">
                <h3 className="font-bold text-vibe-text">{t('visibilityAnonymity')}</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-vibe-text">{t('anonMode')}</h3>
                    <p className="text-xs text-vibe-text-secondary mt-1">
                      {t('anonDescription')}
                    </p>
                  </div>
                  <Switch checked={settings.event_anon_mode} onChange={() => handleToggle('event_anon_mode')} />
                </div>

                <div>
                  <label className="font-semibold text-vibe-text block mb-2">{t('checkinVisibility')}</label>
                  <p className="text-xs text-vibe-text-secondary mb-3">
                    {t('checkinDescription')}
                  </p>
                  <select 
                    value={settings.checkin_visibility} 
                    onChange={e => setSettings((prev: any) => ({ ...prev, checkin_visibility: e.target.value }))} 
                    className="input-field py-2"
                  >
                    <option value="everyone">{t('everyone')}</option>
                    <option value="followers">{t('followers')}</option>
                    <option value="none">{t('none')}</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-vibe-text block mb-2">{t('locationRadius')}</label>
                  <p className="text-xs text-vibe-text-secondary mb-3">
                    {t('locationDescription')}
                  </p>
                  <select 
                    value={settings.location_radius} 
                    onChange={e => setSettings((prev: any) => ({ ...prev, location_radius: e.target.value }))} 
                    className="input-field py-2"
                  >
                    <option value="100m">{t('precise')}</option>
                    <option value="500m">{t('neighborhood')}</option>
                    <option value="city">{t('city')}</option>
                    <option value="off">{t('ghostMode')}</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 mt-6 space-y-2">
                <Button 
                  onClick={() => router.push('/settings/privacy')}
                  variant="outline" 
                  className="w-full justify-between"
                >
                  🔵 {t('socialCircles')}
                  <span>→</span>
                </Button>
                <Button 
                  onClick={() => router.push('/settings/blocks')}
                  variant="outline" 
                  className="w-full justify-between"
                >
                  🛡️ {t('blockedUsers')}
                  <span>→</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-4">{t('pushNotifications')}</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-vibe-text">{t('likesComments')}</h3>
                <Switch checked={settings.push_likes} onChange={() => handleToggle('push_likes')} />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-vibe-text">{t('safetyAlerts')}</h3>
                <Switch checked={settings.push_safety} onChange={() => handleToggle('push_safety')} />
              </div>
            </div>
          </div>
        )}

        {/* Security / GDPR Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-4">{t('securityGdpr')}</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="text-xs font-bold block mb-1">{t('email')}</label>
                <div className="flex gap-2">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field flex-1" />
                  <Button onClick={handleChangeEmail}>{t('update')}</Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">{t('newPassword')}</label>
                <div className="flex gap-2">
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field flex-1" />
                  <Button onClick={handleChangePassword}>{t('update')}</Button>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10 space-y-4">
                <Button variant="outline" className="w-full justify-start text-sm" onClick={handleEnable2FA}>
                  📱 {t('enable2fa')}
                </Button>
                {qrCode && <div dangerouslySetInnerHTML={{ __html: qrCode }} className="bg-white p-2 rounded-xl w-fit" />}
                
                <h3 className="font-bold text-sm text-vibe-text-secondary uppercase mt-8">{t('gdprCompliance')}</h3>
                
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className={`w-full justify-start text-sm ${settings.is_paused ? 'text-green-500' : 'text-orange-500'}`} 
                    onClick={handlePauseAccount}
                  >
                    {settings.is_paused ? `🔓 ${t('resumeAccount')}` : `⏸️ ${t('pauseAccount')}`}
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-sm text-red-500 border-red-500/20 hover:bg-red-500/10" 
                    onClick={handleDeleteAccount}
                  >
                    ❌ {t('deleteAccount')}
                  </Button>

                  {user?.deletion_requested_at && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-xs text-red-400 mb-2">
                        {t('deletionWarning')}
                      </p>
                      <Button onClick={handleReactivate} size="sm" className="w-full">
                        {t('cancelDeletion')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('saving') : t('save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
