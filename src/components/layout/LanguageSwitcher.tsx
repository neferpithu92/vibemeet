'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/i18n/navigation';
import { locales, localeNames } from '@/lib/i18n/config';
import { useTransition, useState, useRef, useEffect } from 'react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const flags: Record<string, string> = {
    it: '🇮🇹', en: '🇬🇧', de: '🇩🇪',
    fr: '🇫🇷', rm: '🇨🇭', es: '🇪🇸', pt: '🇵🇹'
  };

  const handleChange = (newLocale: string) => {
    setOpen(false);
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  // Native names shown in the dropdown
  const nativeNames: Record<string, string> = {
    it: 'Italiano', en: 'English', de: 'Deutsch',
    fr: 'Français', rm: 'Rumantsch', es: 'Español', pt: 'Português'
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger — shows only current flag + tiny chevron */}
      <button
        onClick={() => setOpen(o => !o)}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
                    bg-white/5 border border-white/10 hover:bg-white/10
                    transition-all duration-200 cursor-pointer select-none
                    ${isPending ? 'opacity-50 cursor-wait' : ''}`}
      >
        <span className="text-lg leading-none">{flags[locale]}</span>
        {/* Chevron */}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          className={`text-white/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 z-[200]
                     w-44 py-1.5 rounded-2xl
                     bg-[#1a1025]/95 backdrop-blur-xl
                     border border-white/10
                     shadow-[0_16px_48px_rgba(0,0,0,0.6)]
                     animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {locales.map((l) => (
            <button
              key={l}
              role="option"
              aria-selected={locale === l}
              onClick={() => handleChange(l)}
              className={`w-full flex items-center gap-3 px-3 py-2.5
                          text-sm font-medium transition-all duration-150
                          ${locale === l
                            ? 'bg-vibe-purple/20 text-white'
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                          }`}
            >
              <span className="text-base leading-none w-5 text-center">{flags[l]}</span>
              <span>{nativeNames[l]}</span>
              {locale === l && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-vibe-purple" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
