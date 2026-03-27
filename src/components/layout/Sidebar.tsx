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
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-vibe-surface border-r border-white/5 pt-20 px-4">
      {/* Profilo Business */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-vibe-gradient flex items-center justify-center text-white font-bold">
            V
          </div>
          <div>
            <p className="font-semibold text-sm">{td('yourVenue')}</p>
            <p className="text-xs text-vibe-text-secondary">{td('proPlan')}</p>
          </div>
        </div>
        <div className="badge-verified text-[10px]">
          ✓ {td('verified')}
        </div>
      </div>

      {/* Menu */}
      <nav className="flex flex-col gap-1 flex-1">
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href as any}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300',
                isActive
                   ? 'bg-vibe-purple/15 text-vibe-purple border border-vibe-purple/20'
                  : 'text-vibe-text-secondary hover:text-vibe-text hover:bg-white/5'
              )}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="py-4 border-t border-white/5">
        <p className="text-[10px] text-vibe-text-secondary text-center">
          VIBE Platform © 2026
        </p>
      </div>
    </aside>
  );
}
