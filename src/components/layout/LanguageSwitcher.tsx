'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/i18n/navigation';
import { locales } from '@/lib/i18n/config';
import { useTransition } from 'react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
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
          disabled={isPending}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
            locale === l
              ? 'bg-vibe-purple text-white shadow-lg'
              : 'text-vibe-text-secondary hover:text-vibe-text hover:bg-white/5'
          } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
        >
          {labels[l] || l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
