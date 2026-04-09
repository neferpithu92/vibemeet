'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { generateKeyPairFromPassword } from '@/lib/encryption';

const steps = ['account', 'profile'] as const;
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

export default function RegisterPage() {
  const t = useTranslations('auth');
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

  const validateStep = (): boolean => {
    setError(null);
    if (currentStep === 'account') {
      if (!formData.email || !formData.password) {
        setError(t('errorFields'));
        return false;
      }
      if (formData.password.length < 8) {
        setError(t('errorPasswordLength'));
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError(t('errorPasswordMatch'));
        return false;
      }
    }
    if (currentStep === 'profile') {
      if (!formData.username || !formData.displayName) {
        setError(t('errorUsernameProfile'));
        return false;
      }
      if (formData.username.length < 3) {
        setError(t('errorUsernameLength'));
        return false;
      }
    }
    return true;
  };

  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);

    let cryptoKeys;
    try {
      cryptoKeys = await generateKeyPairFromPassword(formData.password, formData.email);
    } catch (e) {
      console.error("Security layer init failed:", e);
      setError("Security layer initialization failed.");
      setIsLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          username: formData.username.toLowerCase().replace(/\s/g, '_'),
          display_name: formData.displayName,
          public_key: cryptoKeys.publicKey,
        }
      }
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('vibe_public_key', cryptoKeys.publicKey);
      sessionStorage.setItem('vibe_private_key', cryptoKeys.privateKey);
    }

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

    router.push('/onboarding');
    router.refresh();
  };

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
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-vibe-gradient flex items-center justify-center mx-auto mb-4 shadow-lg glow-purple">
          <span className="text-white text-2xl font-bold font-display">V</span>
        </div>
        <h1 className="font-display text-3xl font-bold vibe-gradient-text mb-2">
          {t('joinTitle')}
        </h1>
        <p className="text-vibe-text-secondary text-sm">
          {t('joinSubtitle')}
        </p>
      </div>

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
              {step === 'account' ? t('stepAccount') : t('stepProfile')}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-fade-in">
          {error}
        </div>
      )}

      <Card className="p-6">
        {currentStep === 'account' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-vibe-text-secondary mb-1.5">{t('email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(d => ({ ...d, email: e.target.value }))}
                placeholder={t('placeholderEmail')}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-vibe-text-secondary mb-1.5">{t('password')}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(d => ({ ...d, password: e.target.value }))}
                placeholder={t('placeholderPassword')}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-vibe-text-secondary mb-1.5">{t('confirmPassword')}</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(d => ({ ...d, confirmPassword: e.target.value }))}
                placeholder={t('placeholderConfirm')}
                className="input-field"
              />
            </div>
          </div>
        )}

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
              <p className="text-xs text-vibe-text-secondary mt-2">{avatarPreview ? t('avatarSelected') : t('avatarPrompt')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-vibe-text-secondary mb-1.5">{t('username')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-vibe-text-secondary">@</span>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(d => ({ ...d, username: e.target.value }))}
                  placeholder={t('placeholderUsername')}
                  className="input-field pl-8"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-vibe-text-secondary mb-1.5">{t('placeholderDisplayName')}</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(d => ({ ...d, displayName: e.target.value }))}
                placeholder={t('placeholderDisplayName')}
                className="input-field"
              />
            </div>
          </div>
        )}


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
              ← {t('back')}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleNext}
            className="flex-1"
            isLoading={isLoading}
          >
            {stepIndex === steps.length - 1 ? `🚀 ${t('start')}` : `${t('next')} →`}
          </Button>
        </div>

        <p className="text-[10px] text-vibe-text-secondary opacity-50 text-center mt-4">
          {t('terms')}
        </p>
      </Card>

      <p className="text-center mt-6 text-sm text-vibe-text-secondary">
        {t('haveAccount')}{' '}
        <Link href="/login" className="text-vibe-purple hover:text-vibe-pink transition-colors font-medium">
          {t('login')}
        </Link>
      </p>
    </div>
  );
}
