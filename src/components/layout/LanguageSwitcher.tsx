'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/i18n/navigation';
import { locales, localeNames } from '@/lib/i18n/config';
import { useTransition } from 'react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const flags: Record<string, string> = {
    it: '🇮🇹', en: '🇬🇧', de: '🇩🇪',
    fr: '🇫🇷', rm: '🇨🇭', es: '🇪🇸', pt: '🇵🇹'
  };

  const handleChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1 bg-white/5 
                    p-1 rounded-xl border border-white/10">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => handleChange(l)}
          disabled={isPending}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold 
                      transition-all ${locale === l
            ? 'bg-vibe-purple text-white shadow-lg'
            : 'text-vibe-text-secondary hover:bg-white/5'
          } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
        >
          {flags[l]} {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
