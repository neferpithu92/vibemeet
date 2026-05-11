'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, Link } from '@/lib/i18n/navigation';
import { Search, Bell, X } from 'lucide-react';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { createClient } from '@/lib/supabase/client';

/**
 * Mobile Header — Premium Vibe con ricerca integrata e notifiche.
 * Ricerca unificata per sostituire le ricerche duplicate.
 */
export function MobileHeader() {
  const router = useRouter();
  const supabase = createClient();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  
  const { unreadCount, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        fetchNotifications(user.id);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/discovery/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const combined = [
          ...(data.users || []),
          ...(data.venues || []),
          ...(data.artists || [])
        ].slice(0, 8).map((item: any) => ({
          ...item,
          displayName: item.displayName || item.display_name || item.name || item.title || 'Unknown',
        }));
        setResults(combined);
      } catch (err) {
        console.error('Mobile search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleResultClick = (item: any) => {
    setIsSearchOpen(false);
    setQuery('');
    setResults([]);
    const href = item.type === 'user'
      ? `/u/${item.username || item.id}`
      : item.type === 'venue'
      ? `/venues/${item.slug || item.id}`
      : item.type === 'artist'
      ? `/artists/${item.id}`
      : `/events/${item.id}`;
    router.push(href as any);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[40] md:hidden glass-panel px-4 h-14 flex items-center justify-between border-b border-white/5">
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2 tap-bounce">
          <div className="w-9 h-9 rounded-xl bg-vibe-gradient flex items-center justify-center shadow-lg shadow-vibe-purple/20 border border-white/10">
            <span className="text-white text-sm font-black italic">V</span>
          </div>
          <h1 className="font-display text-xl font-black vibe-gradient-text tracking-tighter uppercase italic">VIBEMEET</h1>
        </Link>
        
        <div className="flex items-center gap-2">
          {/* Search button */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-2xl tap-bounce border border-white/5 hover:bg-vibe-purple/10 transition-all"
            aria-label="Cerca"
          >
            <Search className="w-4.5 h-4.5 text-vibe-text-secondary" />
          </button>

          {/* Notifiche */}
          <button 
            onClick={() => router.push('/notifications')}
            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-2xl tap-bounce border border-white/5 hover:bg-vibe-purple/10 transition-all relative"
            aria-label="Notifiche"
          >
            <Bell className="w-4.5 h-4.5 text-vibe-text-secondary" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-vibe-pink rounded-full animate-pulse shadow-[0_0_6px_rgba(236,72,153,0.8)]" />
            )}
          </button>
        </div>
      </header>

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[200] md:hidden" onClick={() => setIsSearchOpen(false)}>
          <div 
            className="absolute top-0 left-0 right-0 bg-vibe-dark/98 backdrop-blur-xl border-b border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-white/5">
              <Search className="w-5 h-5 text-vibe-text-secondary shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Cerca persone, venue, eventi..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-vibe-text placeholder:text-vibe-text-secondary text-base"
              />
              {isSearching && (
                <div className="w-4 h-4 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <button 
                onClick={() => { setIsSearchOpen(false); setQuery(''); setResults([]); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 tap-bounce shrink-0"
              >
                <X className="w-4 h-4 text-vibe-text-secondary" />
              </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="max-h-[60vh] overflow-y-auto">
                {results.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleResultClick(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                  >
                    <div className="w-10 h-10 rounded-full bg-vibe-gradient/20 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                      {item.avatar_url ? (
                        <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">
                          {item.type === 'user' ? '👤' : item.type === 'artist' ? '🎙️' : item.type === 'venue' ? '🏢' : '🎉'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-vibe-text truncate">{item.displayName}</p>
                      <p className="text-[10px] text-vibe-text-secondary uppercase tracking-widest opacity-60">
                        {item.type === 'user' ? '@' + (item.username || '') : item.type}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {query.length >= 2 && !isSearching && results.length === 0 && (
              <div className="px-4 py-8 text-center text-vibe-text-secondary text-sm">
                Nessun risultato per "{query}"
              </div>
            )}

            {/* Quick links */}
            {query.length < 2 && (
              <div className="p-4 space-y-2">
                <p className="text-[10px] uppercase font-bold text-vibe-text-secondary tracking-widest mb-3">Esplora</p>
                {[
                  { label: '🗺️ Mappa', href: '/map' },
                  { label: '🎉 Eventi', href: '/events' },
                  { label: '🎬 Reels', href: '/reels' },
                  { label: '🔍 Scopri', href: '/explore' },
                ].map((link) => (
                  <button
                    key={link.href}
                    onClick={() => { setIsSearchOpen(false); router.push(link.href as any); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-vibe-text transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
