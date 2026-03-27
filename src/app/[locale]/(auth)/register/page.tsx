'use client';

import { useState, useRef } from 'react';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { generateKeyPairFromPassword } from '@/lib/encryption';

const steps = ['account', 'profile', 'interests', 'location'] as const;
type Step = typeof steps[number];

const interests = [
  { id: 'techno', label: 'Techno', icon: '🎧' },
  { id: 'house', label: 'House', icon: '🏠' },
  { id: 'jazz', label: 'Jazz', icon: '🎷' },
  { id: 'hiphop', label: 'Hip-Hop', icon: '🎤' },
  { id: 'rock', label: 'Rock', icon: '🎸' },
  { id: 'pop', label: 'Pop', icon: '🎵' },
  { id: 'dnb', label: 'Drum & Bass', icon: '🥁' },
  { id: 'latin', label: 'Latin', icon: '💃' },
  { id: 'classical', label: 'Classica', icon: '🎻' },
  { id: 'food', label: 'Food', icon: '🍕' },
  { id: 'art', label: 'Arte', icon: '🎨' },
  { id: 'outdoor', label: 'Outdoor', icon: '🌿' },
  { id: 'sport', label: 'Sport', icon: '⚽' },
  { id: 'comedy', label: 'Comedy', icon: '😂' },
  { id: 'theater', label: 'Teatro', icon: '🎭' },
];

/**
 * Pagina registrazione a step: account → profilo → interessi → posizione.
 * Connessa a Supabase Auth + users table.
 */
export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState<Step>('account');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '',
    username: '', displayName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const stepIndex = steps.indexOf(currentStep);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  /** Valida lo step corrente */
  const validateStep = (): boolean => {
    setError(null);
    if (currentStep === 'account') {
      if (!formData.email || !formData.password) {
        setError('Compila tutti i campi');
        return false;
      }
      if (formData.password.length < 8) {
        setError('La password deve avere almeno 8 caratteri');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Le password non corrispondono');
        return false;
      }
    }
    if (currentStep === 'profile') {
      if (!formData.username || !formData.displayName) {
        setError('Inserisci username e nome visualizzato');
        return false;
      }
      if (formData.username.length < 3) {
        setError('L\'username deve avere almeno 3 caratteri');
        return false;
      }
    }
    if (currentStep === 'interests' && selectedInterests.length < 3) {
      setError('Seleziona almeno 3 interessi');
      return false;
    }
    return true;
  };

  /** Registra l'utente su Supabase Auth e crea il profilo nella tabella users */
  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);

    // 1. Genera KeyPair E2E deterministico dalla password (VEL Initial Setup)
    let cryptoKeys;
    try {
      cryptoKeys = await generateKeyPairFromPassword(formData.password, formData.email);
    } catch (e) {
      console.error("Security layer init failed:", e);
      setError("Errore durante l'inizializzazione del layer di sicurezza.");
      setIsLoading(false);
      return;
    }

    // 2. Crea account su Supabase Auth (include Public Key nei metadati)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          username: formData.username.toLowerCase().replace(/\s/g, '_'),
          display_name: formData.displayName,
          public_key: cryptoKeys.publicKey, // VEL Registry
        }
      }
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    // 3. Persistenza locale temporanea delle chiavi (Session only)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('vibe_public_key', cryptoKeys.publicKey);
      sessionStorage.setItem('vibe_private_key', cryptoKeys.privateKey);
    }

    // 2. Upload avatar if selected
    if (avatarPreview && avatarInputRef.current?.files?.[0]) {
      const file = avatarInputRef.current.files[0];
      const ext = file.name.split('.').pop();
      const { data: uploadData } = await supabase.storage.from('avatars').upload(
        `${authData.user?.id}/avatar.${ext}`, file, { upsert: true }
      );
      if (uploadData) {
        const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
        await supabase.from('users').update({ avatar_url: publicData.publicUrl }).eq('id', authData.user?.id);
      }
    }

    // 3. Redirect a /onboarding per completare il profilo
    // Il profilo viene creato automaticamente dal trigger database
    router.push('/onboarding');
    router.refresh();
  };

  /** Avanza allo step successivo o registra */
  const handleNext = async () => {
    if (!validateStep()) return;

    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1]);
    } else {
      await handleRegister();
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-vibe-gradient flex items-center justify-center mx-auto mb-4 shadow-lg glow-purple">
          <span className="text-white text-2xl font-bold font-display">V</span>
        </div>
        <h1 className="font-display text-3xl font-bold vibe-gradient-text mb-2">
          Unisciti a VIBE
        </h1>
        <p className="text-vibe-text-secondary text-sm">
          Scopri il mondo intorno a te
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-vibe-gradient rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((step, i) => (
            <span
              key={step}
              className={`text-[10px] font-medium ${
                i <= stepIndex ? 'text-vibe-purple' : 'text-vibe-text-secondary opacity-50'
              }`}
            >
              {step === 'account' ? 'Account' : step === 'profile' ? 'Profilo' : step === 'interests' ? 'Interessi' : 'Posizione'}
            </span>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-fade-in">
          {error}
        </div>
      )}

      <Card className="p-6">
        {/* Step 1: Account */}
        {currentStep === 'account' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-vibe-text-secondary mb-1.5">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(d => ({ ...d, email: e.target.value }))}
                placeholder="la-tua@email.ch"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-vibe-text-secondary mb-1.5">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(d => ({ ...d, password: e.target.value }))}
                placeholder="Min. 8 caratteri"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-vibe-text-secondary mb-1.5">Conferma password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(d => ({ ...d, confirmPassword: e.target.value }))}
                placeholder="Ripeti la password"
                className="input-field"
              />
            </div>
          </div>
        )}

        {/* Step 2: Profilo */}
        {currentStep === 'profile' && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-4">
              <div 
                onClick={() => avatarInputRef.current?.click()}
                className="w-24 h-24 rounded-full bg-vibe-gradient/20 flex items-center justify-center mx-auto cursor-pointer hover:bg-vibe-gradient/30 transition-all overflow-hidden"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">📸</span>
                )}
              </div>
              <input 
                ref={avatarInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setAvatarPreview(URL.createObjectURL(file));
                }}
              />
              <p className="text-xs text-vibe-text-secondary mt-2">{avatarPreview ? 'Foto selezionata ✓' : 'Tocca per aggiungere una foto'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-vibe-text-secondary mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-vibe-text-secondary">@</span>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(d => ({ ...d, username: e.target.value }))}
                  placeholder="il_tuo_username"
                  className="input-field pl-8"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-vibe-text-secondary mb-1.5">Nome visualizzato</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(d => ({ ...d, displayName: e.target.value }))}
                placeholder="Come vuoi che ti vedano gli altri?"
                className="input-field"
              />
            </div>
          </div>
        )}

        {/* Step 3: Interessi */}
        {currentStep === 'interests' && (
          <div className="animate-fade-in">
            <h3 className="font-display font-bold text-lg mb-2 text-center">Cosa ti interessa?</h3>
            <p className="text-sm text-vibe-text-secondary text-center mb-4">Seleziona almeno 3 interessi</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {interests.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                    selectedInterests.includes(interest.id)
                      ? 'bg-vibe-purple/20 text-vibe-purple border border-vibe-purple/30 shadow-sm'
                      : 'bg-white/5 text-vibe-text-secondary hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <span>{interest.icon}</span>
                  <span>{interest.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-vibe-text-secondary text-center mt-3">
              {selectedInterests.length} selezionati
            </p>
          </div>
        )}

        {/* Step 4: Posizione */}
        {currentStep === 'location' && (
          <div className="text-center animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-vibe-gradient/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📍</span>
            </div>
            <h3 className="font-display font-bold text-lg mb-2">Abilita posizione</h3>
            <p className="text-sm text-vibe-text-secondary mb-6">
              VIBE funziona meglio sapendo dove ti trovi. Scopri eventi, venue e persone vicine a te.
            </p>
            {locationGranted ? (
              <div className="flex items-center justify-center gap-2 text-green-400 font-bold text-sm">
                <span>✅</span> Posizione abilitata!
              </div>
            ) : (
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      () => setLocationGranted(true),
                      () => setError('Permesso GPS negato. Puoi continuare senza.'),
                      { enableHighAccuracy: true, timeout: 5000 }
                    );
                  } else {
                    setError('Geolocalizzazione non supportata');
                  }
                }}
              >
                📍 Abilita GPS
              </Button>
            )}
          </div>
        )}

        {/* Navigazione step */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
          {stepIndex > 0 && (
            <Button
              variant="ghost"
              onClick={() => {
                setError(null);
                setCurrentStep(steps[stepIndex - 1]);
              }}
              className="flex-1"
            >
              ← Indietro
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleNext}
            className="flex-1"
            isLoading={isLoading}
          >
            {stepIndex === steps.length - 1 ? '🚀 Inizia' : 'Avanti →'}
          </Button>
        </div>

        {/* Termini */}
        <p className="text-[10px] text-vibe-text-secondary opacity-50 text-center mt-4">
          Registrandoti, accetti i nostri Termini di Servizio e la Privacy Policy
        </p>
      </Card>

      {/* Footer */}
      <p className="text-center mt-6 text-sm text-vibe-text-secondary">
        Hai già un account?{' '}
        <Link href="/login" className="text-vibe-purple hover:text-vibe-pink transition-colors font-medium">
          Accedi
        </Link>
      </p>
    </div>
  );
}
