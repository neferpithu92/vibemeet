'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/map', label: 'Mappa', icon: '🗺️' },
  { href: '/feed', label: 'Feed', icon: '▶️' },
  { href: '/create', label: 'Crea', icon: '➕', isCreate: true },
  { href: '/explore', label: 'Scopri', icon: '🔍' },
  { href: '/profile', label: 'Profilo', icon: '👤' },
];

/**
 * Navigazione mobile bottom con 5 tab — Mappa, Feed, Crea, Scopri, Profilo.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-vibe-dark/90 backdrop-blur-xl border-t border-white/5">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = pathname?.startsWith(tab.href);
          
          if (tab.isCreate) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-12 h-12 rounded-2xl bg-vibe-gradient flex items-center justify-center shadow-lg glow-purple transition-transform duration-300 hover:scale-110">
                  <span className="text-xl">{tab.icon}</span>
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-300',
                isActive
                  ? 'text-vibe-purple'
                  : 'text-vibe-text-secondary'
              )}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-vibe-purple mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
