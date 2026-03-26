'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type ThemePreset = 'system' | 'neon' | 'minimal' | 'aurora' | 'sand' | 'ocean' | 'forest' | 'custom';

export interface CustomThemeColors {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

interface ThemeContextType {
  theme: ThemePreset;
  setTheme: (t: ThemePreset) => void;
  customColors: CustomThemeColors;
  setCustomColors: (c: CustomThemeColors) => void;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreset>('system');
  const [customColors, setCustomColorsState] = useState<CustomThemeColors>({ h: 260, s: 100, l: 60 }); // default purple
  const [isLoaded, setIsLoaded] = useState(false);
  const supabase = createClient();

  // Load from local storage immediately to prevent FOUC, then sync with DB
  useEffect(() => {
    const localTheme = localStorage.getItem('vibe-theme') as ThemePreset | null;
    if (localTheme) {
      setThemeState(localTheme);
    }
    
    const localCustom = localStorage.getItem('vibe-theme-custom');
    if (localCustom) {
      try {
        setCustomColorsState(JSON.parse(localCustom));
      } catch (e) {}
    }

    setIsLoaded(true);

    // Sync from Supabase
    const fetchDBTheme = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('user_settings')
        .select('theme_preset, custom_theme_hsl')
        .eq('user_id', session.user.id)
        .single();
        
      if (data) {
        if (data.theme_preset && data.theme_preset !== localTheme) {
          setThemeState(data.theme_preset as ThemePreset);
          localStorage.setItem('vibe-theme', data.theme_preset);
        }
        if (data.custom_theme_hsl) {
          setCustomColorsState(data.custom_theme_hsl);
          localStorage.setItem('vibe-theme-custom', JSON.stringify(data.custom_theme_hsl));
        }
      }
    };

    fetchDBTheme();
  }, [supabase]);

  // Apply to DOM
  useEffect(() => {
    if (!isLoaded) return;

    // Apply data-theme to HTML tag for global variables
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    // Apply Custom HSL if theme is 'custom'
    if (theme === 'custom') {
      // Calculate a harmonic palette based on the chosen HSL
      const { h, s, l } = customColors;
      root.style.setProperty('--vibe-purple', `hsl(${h}, ${s}%, ${l}%)`);
      root.style.setProperty('--vibe-cyan', `hsl(${(h + 180) % 360}, ${s}%, ${l}%)`); // complementary
      root.style.setProperty('--vibe-pink', `hsl(${(h + 60) % 360}, ${s}%, ${l}%)`); // triadic-ish
      root.style.setProperty('--vibe-text-secondary', `hsl(${h}, 30%, 70%)`);
      root.style.setProperty('--vibe-glass', `hsla(${h}, ${s}%, ${l}%, 0.1)`);
      root.style.setProperty('--vibe-border', `hsla(${h}, ${s}%, ${l}%, 0.15)`);
    } else {
      // Clean up custom inline styles to let data-theme fallback kick in
      root.style.removeProperty('--vibe-purple');
      root.style.removeProperty('--vibe-cyan');
      root.style.removeProperty('--vibe-pink');
      root.style.removeProperty('--vibe-text-secondary');
      root.style.removeProperty('--vibe-glass');
      root.style.removeProperty('--vibe-border');
    }
  }, [theme, customColors, isLoaded]);

  // Setters handling both LocalStorage and Supabase DB sync
  const setTheme = async (newTheme: ThemePreset) => {
    setThemeState(newTheme);
    localStorage.setItem('vibe-theme', newTheme);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('user_settings')
        .update({ theme_preset: newTheme })
        .eq('user_id', session.user.id);
    }
  };

  const setCustomColors = async (colors: CustomThemeColors) => {
    setCustomColorsState(colors);
    localStorage.setItem('vibe-theme-custom', JSON.stringify(colors));
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session && theme === 'custom') {
      await supabase
        .from('user_settings')
        .update({ custom_theme_hsl: colors })
        .eq('user_id', session.user.id);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customColors, setCustomColors, isLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
