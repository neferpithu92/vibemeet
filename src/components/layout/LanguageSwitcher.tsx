'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/i18n/navigation';
import { locales } from '@/lib/i18n/config';
import { motion } from 'framer-motion';

/**
 * LanguageSwitcher — Selettore della lingua in formato Segmented Control (orizzontale).
 * Mostra le bandiere e i codici lingua in modo premium e sempre visibile.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const labels: Record<string, { display: string; flag: string }> = {
    it: { display: 'IT IT', flag: '🇮🇹' },
    en: { display: 'GB EN', flag: '🇬🇧' },
    de: { display: 'DE DE', flag: '🇩🇪' },
    fr: { display: 'FR FR', flag: '🇫🇷' },
    rm: { display: 'CH RM', flag: '🇨🇭' }
  };

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale || isPending) return;
    
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
      {locales.map((l) => {
        const isActive = locale === l;
        return (
          <button
            key={l}
            onClick={() => handleLocaleChange(l)}
            disabled={isPending}
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 group ${
              isPending ? 'opacity-50 cursor-wait' : ''
            }`}
          >
            {/* Background Highlight per l'elemento attivo */}
            {isActive && (
              <motion.div
                layoutId="active-locale"
                className="absolute inset-0 bg-vibe-purple rounded-xl shadow-[0_0_15px_rgba(157,78,221,0.4)]"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}

            <span className={`relative z-10 text-sm leading-none transition-transform duration-300 group-hover:scale-110 ${
              !isActive && 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'
            }`}>
              {labels[l]?.flag}
            </span>
            
            <span className={`relative z-10 text-[9px] font-black tracking-tighter transition-colors duration-300 ${
              isActive ? 'text-white' : 'text-vibe-text-secondary group-hover:text-vibe-text'
            }`}>
              {labels[l]?.display}
            </span>
          </button>
        );
      })}
    </div>
  );
}
