'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/lib/i18n/navigation';

interface SettingsPageProps {
  initialSettings: any;
  user: any;
}

/**
 * Pagina Settings — Permette all'utente di gestire account, privacy e notifiche.
 */
export default function SettingsPage({ initialSettings, user }: SettingsPageProps) {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState(initialSettings || {
    is_private: false,
    show_activity: true,
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

      alert('Impostazioni salvate con successo!');
    } catch (e) {
      console.error(e);
      alert('Errore al salvataggio');
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
      alert('Avatar caricato.');
    }
  };

  const handleChangeEmail = async () => {
    const { error } = await supabase.auth.updateUser({ email });
    if (!error) alert("Controlla la tua email per confermare il cambio");
  };

  const handleChangePassword = async () => {
    if (!password) return;
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) alert("Password cambiata con successo");
  };

  const handleEnable2FA = async () => {
    const { data } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (data) {
      setQrCode(data.totp.qr_code);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Sei sicuro di voler eliminare definitivamente il tuo account?')) return;
    await supabase.from('users').update({ 
      username: `deleted_${Date.now()}`,
      email: null,
      bio: null,
      avatar_url: null,
      is_deleted: true 
    }).eq('id', user?.id);
    
    // Assuming backend endpoint exists for auth.admin.deleteUser
    await fetch('/api/user/delete', { method: 'POST' });
    await supabase.auth.signOut();
    router.push('/');
  };

  const tabs = [
    { id: 'profile', label: 'Profilo' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'notifications', label: 'Notifiche' },
    { id: 'security', label: 'Sicurezza' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0">
        <h1 className="text-2xl font-display font-bold mb-6">Impostazioni</h1>
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
            <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-4">Modifica Profilo</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="text-xs text-vibe-text-secondary font-bold uppercase mb-1 block">Avatar</label>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="input-field py-2" />
              </div>
              <div>
                <label className="text-xs text-vibe-text-secondary font-bold uppercase mb-1 block">Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-field py-2" />
              </div>
              <div>
                <label className="text-xs text-vibe-text-secondary font-bold uppercase mb-1 block">Nome Completo</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field py-2" />
              </div>
              <div>
                <label className="text-xs text-vibe-text-secondary font-bold uppercase mb-1 block">Lingua</label>
                <select value={settings.language} onChange={e => setSettings((prev: Record<string, any>) => ({ ...prev, language: e.target.value }))} className="input-field py-2">
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                </select>
              </div>

              <div className="pt-4 mt-6 border-t border-white/10">
                <Button 
                  onClick={() => router.push('/settings/theme')}
                  variant="outline" 
                  className="w-full justify-between"
                >
                  🎨 Theme Engine (Aspetto)
                  <span>→</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-4">Privacy & Safe Home</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-vibe-text">Account Privato</h3>
                  <p className="text-xs text-vibe-text-secondary mt-1">
                    Solo chi approvi può vedere i tuoi post.
                  </p>
                </div>
                <Switch checked={settings.is_private} onChange={() => handleToggle('is_private')} />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-vibe-text">Mostra Stato Attività</h3>
                  <p className="text-xs text-vibe-text-secondary mt-1">
                    Consenti agli account che segui di vedere quando sei online.
                  </p>
                </div>
                <Switch checked={settings.show_activity} onChange={() => handleToggle('show_activity')} />
              </div>

              <div className="pt-4 border-t border-white/10 space-y-6">
                <h3 className="font-bold text-vibe-text">Visibilità e Anonimato</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-vibe-text">Modo Anonimo per Eventi</h3>
                    <p className="text-xs text-vibe-text-secondary mt-1">
                      Nasconde il tuo profilo dagli RSVP, pur conteggiando la tua presenza.
                    </p>
                  </div>
                  <Switch checked={settings.event_anon_mode} onChange={() => handleToggle('event_anon_mode')} />
                </div>

                <div>
                  <label className="font-semibold text-vibe-text block mb-2">Visibilità Check-in</label>
                  <p className="text-xs text-vibe-text-secondary mb-3">
                    Decidi chi può vedere i tuoi check-in sui locali della mappa.
                  </p>
                  <select 
                    value={settings.checkin_visibility} 
                    onChange={e => setSettings((prev: any) => ({ ...prev, checkin_visibility: e.target.value }))} 
                    className="input-field py-2"
                  >
                    <option value="everyone">Tutti</option>
                    <option value="followers">Solo Amici/Follower</option>
                    <option value="none">Nessuno</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-vibe-text block mb-2">Raggio Posizione VIBE (Heatmap)</label>
                  <p className="text-xs text-vibe-text-secondary mb-3">
                    Scegli con che precisione condividere i tuoi dati anonimizzati per le Heatmap e per i suggerimenti vicino a te.
                  </p>
                  <select 
                    value={settings.location_radius} 
                    onChange={e => setSettings((prev: any) => ({ ...prev, location_radius: e.target.value }))} 
                    className="input-field py-2"
                  >
                    <option value="100m">Preciso (100m)</option>
                    <option value="500m">Quartiere (500m)</option>
                    <option value="city">Città</option>
                    <option value="off">Off (Invisibile / Modalità Fantasma)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 mt-6 space-y-2">
                <Button 
                  onClick={() => router.push('/settings/privacy')}
                  variant="outline" 
                  className="w-full justify-between"
                >
                  🔵 Social Circles (Whitelist & Visibilità)
                  <span>→</span>
                </Button>
                <Button 
                  onClick={() => router.push('/settings/blocks')}
                  variant="outline" 
                  className="w-full justify-between"
                >
                  🛡️ Gestione Utenti Bloccati
                  <span>→</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-4">Notifiche Push</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-vibe-text">Mi piace e Commenti</h3>
                <Switch checked={settings.push_likes} onChange={() => handleToggle('push_likes')} />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-vibe-text">Allarmi Safety / Safe Home</h3>
                <Switch checked={settings.push_safety} onChange={() => handleToggle('push_safety')} />
              </div>
            </div>
          </div>
        )}

        {/* Security / GDPR Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-4">Sicurezza & Dati Personali</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="text-xs font-bold block mb-1">Email</label>
                <div className="flex gap-2">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field flex-1" />
                  <Button onClick={handleChangeEmail}>Aggiorna</Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Nuova Password</label>
                <div className="flex gap-2">
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field flex-1" />
                  <Button onClick={handleChangePassword}>Aggiorna</Button>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10 space-y-4">
                <Button variant="outline" className="w-full justify-start text-sm" onClick={handleEnable2FA}>
                  📱 Attiva 2FA
                </Button>
                {qrCode && <div dangerouslySetInnerHTML={{ __html: qrCode }} className="bg-white p-2 rounded-xl w-fit" />}
                
                <h3 className="font-bold text-sm text-vibe-text-secondary uppercase mt-8">GDPR & Compliance</h3>
                <Button variant="outline" className="w-full justify-start text-sm text-red-500 border-red-500/20 hover:bg-red-500/10" onClick={handleDeleteAccount}>
                  ❌ Elimina Account Definitivamente
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvataggio...' : 'Salva Impostazioni'}
          </Button>
        </div>
      </div>
    </div>
  );
}
