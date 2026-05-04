'use client';

import { Link, usePathname } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

/**
 * Sidebar desktop per sezione Dashboard / Business.
 */
export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const td = useTranslations('dashboard');

  const sidebarLinks = [
    { href: '/dashboard', label: t('dashboard'), icon: '📊' },
    { href: '/dashboard/events', label: t('events'), icon: '🎉' },
    { href: '/dashboard/analytics', label: t('analytics'), icon: '📈' },
    { href: '/dashboard/media', label: t('media'), icon: '🎬' },
    { href: '/dashboard/subscription', label: t('subscription'), icon: '💎' },
    { href: '/dashboard/settings', label: t('settings'), icon: '⚙️' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 min-h-screen glass-panel border-r border-white/5 pt-20 px-6 fixed left-0 top-0 z-20">
      {/* Brand / Context */}
      <div className="mb-10 px-2">
        <h2 className="text-[10px] font-black text-vibe-purple uppercase tracking-[0.3em] mb-6 opacity-80">
          Dashboard Area
        </h2>
        
        <div className="glass-card p-5 relative overflow-hidden group hover:border-vibe-purple/40 transition-all duration-500">
          <div className="absolute top-0 right-0 w-24 h-24 bg-vibe-purple/5 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-vibe-gradient flex items-center justify-center text-white font-black text-xl shadow-lg shadow-vibe-purple/20">
              V
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">{td('yourVenue')}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-[10px] font-black text-vibe-text-secondary uppercase tracking-widest">{td('proPlan')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex flex-col gap-2 flex-1 px-2">
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href as any}
              className={cn(
                'flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 tap-bounce relative group',
                isActive
                   ? 'bg-vibe-purple text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                  : 'text-vibe-text-secondary hover:text-white hover:bg-white/5'
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-white/10 blur-xl opacity-30" />
              )}
              <span className={cn(
                "text-lg transition-transform duration-500 group-hover:scale-110",
                isActive ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "opacity-70"
              )}>
                {link.icon}
              </span>
              <span className="relative z-10">{link.label}</span>
              
              {isActive && (
                <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="py-4 border-t border-vibe-border">
        <p className="text-[10px] text-vibe-text-secondary text-center">
          VIBE Platform © 2026
        </p>
      </div>
    </aside>
  );
}
