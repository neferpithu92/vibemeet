'use client';

import { Link } from '@/lib/i18n/navigation';
import { NotificationDropdown } from './NotificationDropdown';
import { GlobalSearch } from './GlobalSearch';

/**
 * Header superiore per mobile — Logo VIBE e Notifiche.
 */
export function MobileHeader() {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 bg-vibe-dark/60 backdrop-blur-2xl border-b border-white/5">
      {/* Logo */}
      <Link href="/map" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-vibe-gradient flex items-center justify-center">
          <span className="text-white font-bold text-xs">V</span>
        </div>
        <span className="font-display text-lg font-bold vibe-gradient-text uppercase tracking-wider">
          Vibe
        </span>
      </Link>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <GlobalSearch />
        <NotificationDropdown />
      </div>
    </header>
  );
}
