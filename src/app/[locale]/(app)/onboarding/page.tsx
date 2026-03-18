'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

const MOCK_INTERESTS = [
  { id: '1', name: 'Techno', icon: '🎧' },
  { id: '2', name: 'House', icon: '🏠' },
  { id: '3', name: 'Hip-Hop', icon: '🎤' },
  { id: '4', name: 'Live Music', icon: '🎸' },
  { id: '5', name: 'Rooftops', icon: '🌇' },
  { id: '6', name: 'Underground', icon: '🚇' },
  { id: '7', name: 'LGBTQ+', icon: '🌈' },
  { id: '8', name: 'Afterhours', icon: '🌅' },
  { id: '9', name: 'Lounge', icon: '🍸' },
  { id: '10', name: 'Festivals', icon: '🎪' },
];

/**
 * User Onboarding Flow —
 * Cattura Età, Genere e Interessi per popolare l'algoritmo FYP.
 */
export default function UserOnboardingPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, [supabase]);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    dob: '',
    gender: '', // male, female, non-binary, prefer-not
    selectedInterests: [] as string[],
  });

  const [loading, setLoading] = useState(false);

  const toggleInterest = (id: string) => {
    setFormData(prev => ({
      ...prev,
      selectedInterests: prev.selectedInterests.includes(id)
        ? prev.selectedInterests.filter(i => i !== id)
        : [...prev.selectedInterests, id]
    }));
  };

  const handleNext = async () => {
    if (!userId) return;

    if (step === 1) {
      if (!formData.dob) return;
      setLoading(true);
      await supabase.from('users').update({ date_of_birth: formData.dob }).eq('id', userId);
      setLoading(false);
      setStep(step + 1);
      return;
    }

    if (step === 2) {
      setStep(step + 1);
      return;
    }

    if (step === 3) {
      setLoading(true);
      
      // Salva Interessi
      const interests = formData.selectedInterests.map(id => {
        const genre = MOCK_INTERESTS.find(i => i.id === id)?.name;
        return {
          user_id: userId,
          interest_type: 'genre',
          interest_value: genre,
          score: 1.0
        };
      });
      await supabase.from('user_interests').upsert(interests);

      // Richiedi posizione
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await supabase.from('users').update({
            last_location: `POINT(${pos.coords.longitude} ${pos.coords.latitude})`,
            map_visibility: 'friends'
          }).eq('id', userId);
          setLoading(false);
          window.location.href = '/';
        }, () => {
          setLoading(false);
          window.location.href = '/';
        });
      } else {
        setLoading(false);
        window.location.href = '/';
      }
    }
  };

  const handleSkip = () => {
    setStep(step + 1);
  };

  return (
    <div className="min-h-screen bg-vibe-dark flex flex-col pt-12">
      <div className="max-w-md w-full mx-auto px-6 px-4 flex-1 flex flex-col">
        
        {/* Header */}
        <div className="text-center mb-10 pt-8 animate-fade-in">
          <h1 className="text-4xl font-display font-bold vibe-gradient-text mb-4">vibemeet</h1>
          <p className="text-vibe-text-secondary text-base">
            Personalizziamo la tua esperienza.
          </p>
        </div>

        {/* Form Container */}
        <div className="flex-1">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <span className="text-5xl mb-4 block">🎂</span>
                <h2 className="text-2xl font-bold text-white mb-2">Quando sei nato?</h2>
                <p className="text-sm text-vibe-text-secondary">
                  Devi avere almeno 16 anni per usare vibemeet, in conformità con le leggi svizzere. Questa informazione non sarà pubblica.
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
                  {loading ? 'Salvataggio...' : 'Continua'}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <span className="text-5xl mb-4 block">👤</span>
                <h2 className="text-2xl font-bold text-white mb-2">Come ti identifichi?</h2>
                <p className="text-sm text-vibe-text-secondary">
                  Ci aiuta a offrirti contenuti più rilevanti nel feed For You. Puoi saltare questo passaggio.
                </p>
              </div>
              
              <div className="space-y-3 px-4">
                {[
                  { id: 'female', label: 'Donna' },
                  { id: 'male', label: 'Uomo' },
                  { id: 'non-binary', label: 'Non-Binario' },
                  { id: 'prefer-not', label: 'Preferisco non specificarlo' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setFormData({...formData, gender: opt.id})}
                    className={`w-full py-4 px-6 rounded-xl font-medium text-left transition-all ${
                      formData.gender === opt.id 
                        ? 'bg-vibe-purple/20 text-vibe-pink border border-vibe-purple/40 ring-2 ring-vibe-purple/20' 
                        : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="px-4 pt-8 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleSkip}>
                  Salta
                </Button>
                <Button className="flex-1" disabled={!formData.gender} onClick={handleNext}>
                  Continua
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <span className="text-5xl mb-4 block">🎧</span>
                <h2 className="text-2xl font-bold text-white mb-2">Cosa ti piace?</h2>
                <p className="text-sm text-vibe-text-secondary">
                  Seleziona almeno 3 generi o stili per impostare l'algoritmo ({formData.selectedInterests.length}/3).
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
                    <span>{interest.name}</span>
                  </button>
                ))}
              </div>

              <div className="px-4 pt-12 pb-8 sticky bottom-0 bg-vibe-dark w-full left-0 z-10 border-t border-white/5 mt-8">
                <Button 
                  className="w-full text-lg py-6"
                  disabled={formData.selectedInterests.length < 3 || loading}
                  onClick={handleNext}
                >
                  {loading ? 'Preparazione del Feed...' : "Iniziamo!"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Progress dots at bottom */}
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
