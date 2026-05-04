'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';
import { Map, Clapperboard, Plus, MessageSquare, User } from 'lucide-react';

/**
 * Navigazione mobile bottom con 5 tab — Stile Premium.
 */
export function BottomNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const tabs = [
    { href: '/map', label: t('map'), Icon: Map },
    { href: '/reels', label: 'Reels', Icon: Clapperboard },
    { href: '/create', label: '+', Icon: Plus, isCreate: true },
    { href: '/chat', label: t('chat'), Icon: MessageSquare },
    { href: '/profile', label: t('profile'), Icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] glass-panel border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
          const Icon = tab.Icon;
          
          if (tab.isCreate) {
            return (
              <Link
                key={tab.href}
                href={tab.href as any}
                className="flex flex-col items-center justify-center -mt-8 tap-bounce"
              >
                <div className="w-14 h-14 rounded-full bg-vibe-gradient flex items-center justify-center shadow-[0_0_20px_rgba(157,78,221,0.5)] border-4 border-vibe-dark">
                  <Icon className="w-7 h-7 text-white" strokeWidth={3} />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href as any}
              className={cn(
                'flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-500 tap-bounce relative',
                isActive ? 'text-vibe-purple' : 'text-vibe-text-secondary'
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-vibe-purple/10 blur-xl opacity-50" />
              )}
              <Icon 
                className={cn('w-6 h-6 transition-all duration-500', isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]' : 'opacity-70')} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest transition-all",
                isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 h-0 overflow-hidden"
              )}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
