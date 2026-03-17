'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/events', label: 'I miei eventi', icon: '🎉' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '📈' },
  { href: '/dashboard/media', label: 'Media', icon: '🎬' },
  { href: '/dashboard/subscription', label: 'Abbonamento', icon: '💎' },
  { href: '/dashboard/settings', label: 'Impostazioni', icon: '⚙️' },
];

/**
 * Sidebar desktop per sezione Dashboard / Business.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-vibe-surface border-r border-white/5 pt-20 px-4">
      {/* Profilo Business */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-vibe-gradient flex items-center justify-center text-white font-bold">
            V
          </div>
          <div>
            <p className="font-semibold text-sm">La Tua Venue</p>
            <p className="text-xs text-vibe-text-secondary">Piano Pro</p>
          </div>
        </div>
        <div className="badge-verified text-[10px]">
          ✓ Verificato
        </div>
      </div>

      {/* Menu */}
      <nav className="flex flex-col gap-1 flex-1">
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
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
