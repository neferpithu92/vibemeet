'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/i18n/navigation';
import { locales } from '@/lib/i18n/config';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * LanguageSwitcher — Selettore della lingua in formato dropdown con stile premium glassmorphism.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const labels: Record<string, { label: string; flag: string }> = {
    it: { label: 'Italiano', flag: '🇮🇹' },
    en: { label: 'English', flag: '🇬🇧' },
    de: { label: 'Deutsch', flag: '🇩🇪' },
    fr: { label: 'Français', flag: '🇫🇷' },
    rm: { label: 'Rumantsch', flag: '🇨🇭' }
  };

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }
    
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
      setIsOpen(false);
    });
  };

  // Chiudi cliccando fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
          isOpen 
            ? 'bg-vibe-purple/20 border-vibe-purple shadow-[0_0_15px_rgba(157,78,221,0.2)]' 
            : 'bg-white/5 border-white/10 hover:bg-white/10'
        } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
      >
        <span className="text-base leading-none">
          {labels[locale]?.flag || '🌐'}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-vibe-text">
          {locale}
        </span>
        <ChevronDown 
          className={`w-3 h-3 text-vibe-text-secondary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute top-full right-0 mt-2 min-w-[160px] z-[100]"
          >
            <div className="bg-vibe-dark/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl overflow-hidden">
              <div className="py-1 px-3 mb-1">
                <p className="text-[9px] uppercase font-black text-vibe-text-secondary tracking-[0.1em]">
                  Select Language
                </p>
              </div>
              
              <div className="space-y-0.5">
                {locales.map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLocaleChange(l)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                      locale === l
                        ? 'bg-vibe-purple text-white'
                        : 'text-vibe-text-secondary hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base leading-none grayscale group-hover:grayscale-0 transition-all duration-300">
                        {labels[l]?.flag}
                      </span>
                      <span>{labels[l]?.label}</span>
                    </div>
                    {locale === l && (
                      <Check className="w-3.5 h-3.5 text-white animate-in zoom-in duration-300" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
