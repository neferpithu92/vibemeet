'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/i18n/navigation';
import { useTheme, ThemePreset } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';

const THEME_PRESETS: { id: ThemePreset; name: string; colors: string[] }[] = [
  { id: 'system', name: 'System (Auto)', colors: ['#7C3AED', '#EC4899', '#06B6D4'] },
  { id: 'light', name: 'Light Mode', colors: ['#FFFFFF', '#6D28D9', '#0F172A'] },
  { id: 'dark', name: 'Dark Mode', colors: ['#0A0A0F', '#7C3AED', '#F8F8FF'] },
  { id: 'neon', name: 'Neon', colors: ['#D926A9', '#FF00FF', '#00FF00'] },
  { id: 'minimal', name: 'Minimal', colors: ['#FFFFFF', '#CCCCCC', '#050505'] },
  { id: 'aurora', name: 'Aurora', colors: ['#2F80ED', '#8F94FB', '#00FFB2'] },
  { id: 'sand', name: 'Sand', colors: ['#D4A373', '#FAEDCD', '#E9EDC9'] },
  { id: 'ocean', name: 'Ocean', colors: ['#0077B6', '#90E0EF', '#00B4D8'] },
  { id: 'forest', name: 'Forest', colors: ['#84CC16', '#D9F99D', '#A3E635'] },
  { id: 'custom', name: 'Custom', colors: [] },
];

export default function ThemeSettingsPage() {
  const t = useTranslations('settings'); // Fallback translations
  const router = useRouter();
  const { theme, setTheme, customColors, setCustomColors } = useTheme();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // State is already saved real-time via the Context (localStorage + DB sync handled inside Context API setter)
    setTimeout(() => {
      setIsSaving(false);
      router.back();
    }, 600);
  };

  return (
    <div className="page-container p-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-display font-bold">Theme Engine</h1>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-vibe-text-secondary uppercase tracking-wider mb-4">
            Presets
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {THEME_PRESETS.map((preset) => {
              const isActive = theme === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setTheme(preset.id)}
                  className={`cursor-pointer rounded-2xl border-2 transition-all p-4 ${
                    isActive ? 'border-vibe-purple bg-vibe-purple/10' : 'border-white/10 hover:border-white/20 bg-white/5'
                  }`}
                >
                  <p className="font-semibold text-sm mb-3">
                    {preset.name}
                  </p>
                  <div className="flex gap-2 h-6">
                    {preset.id === 'custom' ? (
                      <div className="flex-1 rounded-full bg-gradient-to-r from-red-500 via-green-500 to-blue-500" />
                    ) : (
                      preset.colors.map((color, i) => (
                        <div key={i} className="flex-1 rounded-full" style={{ backgroundColor: color }} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {theme === 'custom' && (
          <section className="glass-card p-6 animate-slide-up">
            <h2 className="text-sm font-semibold text-vibe-text-secondary uppercase tracking-wider mb-4">
              Custom Editor
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium flex justify-between">
                  <span>Hue (H)</span>
                  <span>{customColors.h}°</span>
                </label>
                <input
                  type="range"
                  min="0" max="360"
                  value={customColors.h}
                  onChange={(e) => setCustomColors({ ...customColors, h: Number(e.target.value) })}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer mt-2"
                  style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium flex justify-between">
                  <span>Saturation (S)</span>
                  <span>{customColors.s}%</span>
                </label>
                <input
                  type="range"
                  min="0" max="100"
                  value={customColors.s}
                  onChange={(e) => setCustomColors({ ...customColors, s: Number(e.target.value) })}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer mt-2 accent-vibe-purple"
                />
              </div>

              <div>
                <label className="text-sm font-medium flex justify-between">
                  <span>Lightness (L)</span>
                  <span>{customColors.l}%</span>
                </label>
                <input
                  type="range"
                  min="0" max="100"
                  value={customColors.l}
                  onChange={(e) => setCustomColors({ ...customColors, l: Number(e.target.value) })}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer mt-2 accent-vibe-purple"
                />
              </div>

              <div className="mt-6 p-4 rounded-xl border border-vibe-border" style={{
                background: `hsla(${customColors.h}, ${customColors.s}%, ${customColors.l}%, 0.1)`
              }}>
                <p className="text-center font-bold" style={{ color: `hsl(${customColors.h}, ${customColors.s}%, ${customColors.l}%)` }}>
                  Preview Colore Custom
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="mt-12">
        <Button onClick={handleSave} disabled={isSaving} className="w-full primary-gradient py-4 text-lg font-bold">
          {isSaving ? 'Salvataggio...' : 'Applica & Salva'}
        </Button>
      </div>
    </div>
  );
}
