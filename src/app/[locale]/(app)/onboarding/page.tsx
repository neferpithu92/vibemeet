'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import MediaUpload from '@/components/ui/MediaUpload';

interface Interest {
  id: string;
  label: string;
  icon: string;
  category: string;
}

const MOCK_INTERESTS: Interest[] = [
  { id: 'techno', label: 'Techno', icon: '🎵', category: 'music' },
  { id: 'house', label: 'House', icon: '🎶', category: 'music' },
  { id: 'hiphop', label: 'Hip Hop', icon: '🎤', category: 'music' },
  { id: 'rnb', label: 'R&B', icon: '🎸', category: 'music' },
  { id: 'jazz', label: 'Jazz', icon: '🎷', category: 'music' },
  { id: 'rock', label: 'Rock', icon: '🤘', category: 'music' },
  { id: 'clubbing', label: 'Clubbing', icon: '🪩', category: 'lifestyle' },
  { id: 'outdoor', label: 'Outdoor', icon: '🌿', category: 'lifestyle' },
  { id: 'food', label: 'Food', icon: '🍴', category: 'lifestyle' },
  { id: 'art', label: 'Arte', icon: '🎨', category: 'lifestyle' },
  { id: 'sport', label: 'Sport', icon: '⚽', category: 'lifestyle' },
  { id: 'festival', label: 'Festival', icon: '🎪', category: 'events' },
  { id: 'concert', label: 'Concerti', icon: '🎸', category: 'events' },
  { id: 'aperitivo', label: 'Aperitivo', icon: '🍹', category: 'events' },
];

interface OnboardingFormData {
  dob: string;
  gender: string;
  selectedInterests: string[];
  avatarUrl: string;
}

export default function UserOnboardingPage() {
  const t = useTranslations('onboarding');
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: any }) => setUserId(data.user?.id || null));
  }, [supabase]);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>({
    dob: '',
    gender: '',
    selectedInterests: [],
    avatarUrl: '',
  });

  const [loading, setLoading] = useState(false);

  const toggleInterest = (id: string) => {
    setFormData((prev: OnboardingFormData) => ({
      ...prev,
      selectedInterests: prev.selectedInterests.includes(id)
        ? prev.selectedInterests.filter((i: string) => i !== id)
        : [...prev.selectedInterests, id]
    }));
  };

  const handleNext = async () => {
    if (!userId) return;

    if (step === 1) {
      if (!formData.dob) return;
      setLoading(true);
      await (supabase as any).from('users').update({ date_of_birth: formData.dob }).eq('id', userId);
      setLoading(false);
      setStep(step + 1);
      return;
    }

    if (step === 2) {
      setLoading(true);
      if (formData.gender || formData.avatarUrl) {
        await (supabase as any).from('users').update({ 
          gender: formData.gender,
          avatar_url: formData.avatarUrl 
        }).eq('id', userId);
      }
      setLoading(false);
      setStep(step + 1);
      return;
    }

    if (step === 3) {
      setLoading(true);
      
      const interestsToSave = formData.selectedInterests.map((id: string) => ({
        user_id: userId,
        category: MOCK_INTERESTS.find((i: Interest) => i.id === id)?.label || id,
      }));
      
      const { error: interestsError } = await (supabase as any)
        .from('user_onboarding_interests')
        .upsert(interestsToSave, { onConflict: 'user_id,category' });

      if (interestsError) console.error('Error saving interests:', interestsError);

      await (supabase as any).from('users').update({ onboarding_completed: true }).eq('id', userId);

      window.location.href = '/map';
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setStep(step + 1);
  };

  return (
    <div className="min-h-screen bg-vibe-dark flex flex-col pt-12">
      <div className="max-w-md w-full mx-auto px-6 px-4 flex-1 flex flex-col">
        
        <div className="text-center mb-10 pt-8 animate-fade-in">
          <h1 className="text-4xl font-display font-bold vibe-gradient-text mb-4">vibemeet</h1>
          <p className="text-vibe-text-secondary text-base">
            {t('title')}
          </p>
        </div>

        <div className="flex-1">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <span className="text-5xl mb-4 block">🎂</span>
                <h2 className="text-2xl font-bold text-white mb-2">{t('step1Title')}</h2>
                <p className="text-sm text-vibe-text-secondary">
                  {t('step1Subtitle')}
                </p>
              </div>
              
              <div className="px-4">
                <input 
                  type="date" 
                  value={formData.dob} 
                  onChange={e => setFormData({...formData, dob: e.target.value})} 
                  className="w-full text-center text-lg p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-vibe-purple transition-colors"
                />
              </div>

              <div className="px-4 pt-12">
                <Button 
                  className="w-full text-lg py-6"
                  disabled={!formData.dob || loading}
                  onClick={handleNext}
                >
                  {loading ? t('saving') : t('continue')}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <span className="text-5xl mb-4 block">👤</span>
                <h2 className="text-2xl font-bold text-white mb-2">{t('step2Title')}</h2>
                <p className="text-sm text-vibe-text-secondary">
                  {t('step2Subtitle')}
                </p>
              </div>
              
              <div className="px-4 space-y-8">
                <div>
                  <label className="text-xs font-bold uppercase text-vibe-text-secondary block mb-3 text-center">{t('uploadAvatar')}</label>
                  <div className="max-w-[160px] mx-auto">
                    <MediaUpload 
                      bucket="avatars" 
                      aspectRatio="square"
                      onUploadComplete={(url) => setFormData({...formData, avatarUrl: url})}
                      label={t('uploadButton')}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase text-vibe-text-secondary block text-center">{t('genderLabel')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'female', label: t('female') },
                      { id: 'male', label: t('male') },
                      { id: 'non-binary', label: t('nonBinary') },
                      { id: 'prefer-not', label: t('other') },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setFormData({...formData, gender: opt.id})}
                        className={`py-3 px-4 rounded-xl font-medium text-center transition-all text-sm ${
                          formData.gender === opt.id 
                            ? 'bg-vibe-purple/20 text-vibe-pink border border-vibe-purple/40 ring-2 ring-vibe-purple/20' 
                            : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-4 pt-8 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleSkip}>
                  {t('skip')}
                </Button>
                <Button className="flex-1" disabled={!formData.gender} onClick={handleNext}>
                  {t('continue')}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <span className="text-5xl mb-4 block">🎧</span>
                <h2 className="text-2xl font-bold text-white mb-2">{t('step3Title')}</h2>
                <p className="text-sm text-vibe-text-secondary">
                  {t('step3Subtitle')} ({formData.selectedInterests.length}/3).
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3 px-2 justify-center">
                {MOCK_INTERESTS.map(interest => (
                  <button
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    className={`px-4 py-3 rounded-2xl flex items-center gap-2 font-medium transition-all duration-300 transform ${
                      formData.selectedInterests.includes(interest.id)
                        ? 'bg-gradient-to-br from-vibe-purple to-vibe-pink text-white scale-105 shadow-xl shadow-vibe-purple/25'
                        : 'bg-white/5 text-vibe-text hover:bg-white/10 border border-white/10 hover:scale-105'
                    }`}
                  >
                    <span className="text-xl">{interest.icon}</span>
                    <span>{interest.label}</span>
                  </button>
                ))}
              </div>

              <div className="px-4 pt-12 pb-8 sticky bottom-0 bg-vibe-dark w-full left-0 z-10 border-t border-white/5 mt-8">
                <Button 
                  className="w-full text-lg py-6"
                  disabled={formData.selectedInterests.length < 3 || loading}
                  onClick={handleNext}
                >
                  {loading ? t('preparingFeed') : t('letsGo')}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="py-6 flex justify-center gap-2 pb-12">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-vibe-purple' : i < step ? 'w-4 bg-vibe-purple/50' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
