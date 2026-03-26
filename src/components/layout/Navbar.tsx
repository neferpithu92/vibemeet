'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/lib/i18n/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * Navbar superiore per desktop — logo VIBE, link navigazione, ricerca, avatar utente.
 * Mostra i dati dell'utente autenticato da Supabase.
 */
export function Navbar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>('V');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      if (authUser) {
        // Carica profilo dalla tabella users
        const { data: profile } = await supabase
          .from('users')
          .select('display_name, username, avatar_url')
          .eq('id', authUser.id)
          .single();

        if (profile?.display_name) {
          setDisplayName(profile.display_name);
        } else if (authUser.email) {
          setDisplayName(authUser.email.charAt(0).toUpperCase());
        }
      }
    };

    getUser();

    // Ascolta cambiamenti auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { href: '/map', label: t('map'), icon: '🗺️' },
    { href: '/feed', label: t('feed'), icon: '▶️' },
    { href: '/reels', label: 'Reels', icon: '🎬' },
    { href: '/explore', label: t('explore'), icon: '🔍' },
    { href: '/events', label: t('events'), icon: '🎉' },
  ];

  /** Iniziali per avatar */
  const initials = displayName
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 items-center justify-between px-6 bg-vibe-dark/80 backdrop-blur-xl border-b border-white/5">
      {/* Logo */}
      <Link href="/map" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-vibe-gradient flex items-center justify-center">
          <span className="text-white font-bold text-sm">V</span>
        </div>
        <span className="font-display text-xl font-bold vibe-gradient-text">
          VIBE
        </span>
      </Link>

      {/* Navigazione */}
      <div className="flex items-center gap-1">
        {navLinks.map((link) => {
          const isActive = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href as any}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300',
                isActive
                  ? 'bg-vibe-purple/20 text-vibe-purple'
                  : 'text-vibe-text-secondary hover:text-vibe-text hover:bg-white/5'
              )}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Ricerca + Avatar */}
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        
        <div className="relative">
          <input
            type="text"
            placeholder={t('search')}
            className="input-field w-64 pl-10 py-2 text-sm"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vibe-text-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Notifiche */}
        <button className="relative p-2 rounded-xl text-vibe-text-secondary hover:text-vibe-text hover:bg-white/5 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-vibe-pink rounded-full" />
        </button>

        {/* Avatar con dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2"
          >
            <div className="w-9 h-9 rounded-full bg-vibe-gradient flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-12 w-48 glass-card p-2 animate-fade-in z-50">
              <Link
                href="/profile"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-vibe-text hover:bg-white/10 transition-all"
              >
                👤 {t('profile')}
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-vibe-text hover:bg-white/10 transition-all"
              >
                📊 {t('dashboard')}
              </Link>
              <div className="border-t border-white/5 my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all"
              >
                🚪 {t('logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
