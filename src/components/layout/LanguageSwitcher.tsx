'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/lib/i18n/navigation';
import { locales } from '@/lib/i18n/config';

/**
 * Componente per il cambio lingua (it, en, de, fr, rm).
 * Usa next-intl per gestire il routing localizzato.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  const labels: Record<string, string> = {
    it: '🇮🇹 IT',
    en: '🇬🇧 EN',
    de: '🇩🇪 DE',
    fr: '🇫🇷 FR',
    rm: '🇨🇭 RM'
  };

  return (
    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => handleLocaleChange(l)}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
            locale === l 
              ? 'bg-vibe-purple text-white shadow-lg' 
              : 'text-vibe-text-secondary hover:text-vibe-text hover:bg-white/5'
          }`}
        >
          {labels[l] || l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
