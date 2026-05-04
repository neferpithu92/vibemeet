'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';
import { Map, Clapperboard, Plus, MessageSquare, User } from 'lucide-react';

/**
 * Navigazione mobile bottom con 5 tab — Stile App Nativo (TikTok/Insta pattern).
 */
export function BottomNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const tabs = [
    { href: '/map', label: t('map'), Icon: Map },
    { href: '/reels', label: 'Reels', Icon: Clapperboard },
    { href: '/create', label: t('create'), Icon: Plus, isCreate: true },
    { href: '/chat', label: t('chat'), Icon: MessageSquare },
    { href: '/profile', label: t('profile'), Icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-vibe-dark/60 backdrop-blur-2xl border-t border-vibe-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          // Gestione route attive (reels/feed, ecc)
          const isActive = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
          const Icon = tab.Icon;
          
          if (tab.isCreate) {
            return (
              <Link
                key={tab.href}
                href={tab.href as any}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-12 h-12 rounded-full bg-vibe-gradient flex items-center justify-center shadow-[0_0_20px_rgba(255,0,255,0.4)] transition-transform duration-300 hover:scale-105 active:scale-95">
                  <Icon className="w-6 h-6 text-white" strokeWidth={3} />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href as any}
              className={cn(
                'flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-300 active:scale-90',
                isActive
                  ? 'text-vibe-purple'
                  : 'text-vibe-text-secondary hover:text-vibe-text'
              )}
            >
              <Icon 
                className={cn('w-6 h-6 transition-all', isActive ? 'scale-110' : '')} 
                strokeWidth={isActive ? 2.5 : 2} 
                fill={isActive && tab.label !== 'Reels' && tab.label !== '+' ? 'currentColor' : 'none'}
              />
              <span className="text-[10px] font-medium tracking-wide">
                {tab.label === 'profile' ? t('profile') : tab.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-white mt-0.5 absolute bottom-1" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
