'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/lib/i18n/navigation';

interface GlobalSearchResult {
  id: string;
  displayName: string;
  type: 'user' | 'artist' | 'venue' | 'event';
  avatar_url?: string;
  username?: string;
}

export function GlobalSearch() {
  const t = useTranslations('nav');
  const tm = useTranslations('map');
  const router = useRouter();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        
        // Filter out Mapbox results (only keep internal users/artists and some events/venues)
        const combined = [
          ...(data.users || []),
          ...(data.artists || []),
          ...(data.venues || []),
          ...(data.events || [])
        ].map(item => ({
          ...item,
          displayName: item.displayName || item.name || item.title,
        }));

        setResults(combined);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: GlobalSearchResult) => {
    setQuery('');
    setResults([]);
    
    // Navigate to profile or venue/event page
    if (item.type === 'user') {
      router.push(`/u/${item.username || item.id}`);
    } else if (item.type === 'venue') {
      router.push(`/venues/${(item as any).slug || item.id}`);
    } else if (item.type === 'artist') {
      router.push(`/artists/${item.id}`);
    } else if (item.type === 'event') {
      router.push(`/events/${item.id}`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          placeholder={t('search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-field w-64 md:w-80 pl-10 h-10 text-sm bg-vibe-dark/60 backdrop-blur-md border-white/5 focus:border-vibe-purple/50 transition-all"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vibe-text-secondary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <Card className="absolute top-12 left-0 right-0 p-2 glass-card animate-fade-in z-[100] border-white/10 shadow-2xl">
          <div className="max-h-80 overflow-y-auto space-y-1">
            {results.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => handleSelect(item)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 text-left transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-vibe-gradient/20 flex items-center justify-center text-lg overflow-hidden border border-white/5">
                  {item.avatar_url ? (
                    <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{item.type === 'user' ? '👥' : (item.type === 'artist' ? '🎙️' : (item.type === 'venue' ? '🏢' : '🎉'))}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:text-vibe-purple transition-colors">
                    {item.displayName}
                  </p>
                  <p className="text-[10px] text-vibe-text-secondary truncate uppercase tracking-widest">
                    {item.type === 'user' ? tm('friends') : 
                     item.type === 'artist' ? 'Artist' : 
                     item.type === 'venue' ? tm('venues') : tm('events')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
