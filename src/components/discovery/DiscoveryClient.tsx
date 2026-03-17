'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Link } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';

interface DiscoveryClientProps {
  venues: any[];
  events: any[];
  categories: any[];
}

interface SearchResults {
  events: any[];
  venues: any[];
  artists: any[];
}
export default function DiscoveryClient({ venues, events, categories }: DiscoveryClientProps) {
  const t = useTranslations('explore');
  const tc = useTranslations('common');
  const te = useTranslations('events');
  const tv = useTranslations('venues');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search logic
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/discovery/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredVenues = venues.filter(v => 
    (activeCategory === 'all' || v.type?.toLowerCase() === activeCategory) &&
    (!searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 text-left">
      {/* Header + Ricerca */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold vibe-gradient-text mb-4 text-left">{t('title')}</h1>
        <div className="relative">
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12 py-4 text-base"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-vibe-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Search Results Overlay / Section */}
      {searchResults && searchQuery.length >= 2 && (
        <div className="mb-12 space-y-8 animate-fade-in">
          {searchResults.events.length > 0 && (
            <section>
              <h2 className="section-title mb-4 text-left">{te('title')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchResults.events.map(event => (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <Card hover className="p-4 flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl bg-vibe-purple/10 flex items-center justify-center text-xl">🎉</div>
                      <div className="text-left">
                        <h4 className="font-semibold text-sm">{event.title}</h4>
                        <p className="text-xs text-vibe-text-secondary">{event.venue?.name || 'VIBE Venue'}</p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {searchResults.venues.length > 0 && (
            <section>
              <h2 className="section-title mb-4 text-left">{tv('title')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchResults.venues.map(v => (
                  <Link key={v.id} href={`/venues/${v.slug || v.id}`}>
                    <Card hover className="p-4 flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl bg-vibe-cyan/10 flex items-center justify-center text-xl">🏢</div>
                      <div className="text-left">
                        <h4 className="font-semibold text-sm">{v.name}</h4>
                        <p className="text-xs text-vibe-text-secondary">{v.type || tv('title')}</p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {searchResults.events.length === 0 && searchResults.venues.length === 0 && (
            <p className="text-center py-12 text-vibe-text-secondary">{tc('noContent')}</p>
          )}
        </div>
      )}

      {/* Only show categories and standard lists if NOT searching or no results yet */}
      {(!searchQuery || searchQuery.length < 2) && (
        <>
          {/* Categorie */}
      <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${
              activeCategory === cat.id
                ? 'bg-vibe-purple/20 text-vibe-purple border border-vibe-purple/20'
                : 'bg-white/5 text-vibe-text-secondary hover:bg-white/10'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{t(`categories.${cat.id}`)}</span>
          </button>
        ))}
      </div>

      {/* Trending Events */}
      <section className="mb-8">
        <div className="section-header">
          <h2 className="section-title flex items-center gap-2 text-left">
            <span>🔥</span> {t('trending')}
          </h2>
          <Link href="/events" className="text-sm text-vibe-purple font-medium">{tc('seeAll')}</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {events.slice(0, 3).map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card hover padding="none" className="overflow-hidden group cursor-pointer h-full text-left">
                <div className="h-32 bg-vibe-gradient-subtle relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-vibe-surface to-transparent" />
                  {new Date(event.end_time) > new Date() && new Date(event.start_time) < new Date() && (
                    <div className="absolute top-3 left-3">
                      <Badge variant="live">LIVE</Badge>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1 group-hover:text-vibe-purple transition-colors truncate">{event.title}</h3>
                  <p className="text-xs text-vibe-text-secondary truncate">{event.venues?.name || 'Venue'}</p>
                  <Badge variant="default" className="mt-2">{event.category || 'Event'}</Badge>
                </div>
              </Card>
            </Link>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-vibe-text-secondary col-span-3 text-center py-8 bg-white/5 rounded-2xl">
              {te('noEvents')}
            </p>
          )}
        </div>
      </section>

      {/* Venue Vicine */}
      <section className="mb-8">
        <div className="section-header">
          <h2 className="section-title flex items-center gap-2 text-left">
            <span>📍</span> {t('nearbyVenues')}
          </h2>
          <Link href="/map" className="text-sm text-vibe-purple font-medium">{t('title')}</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredVenues.map((venue) => (
            <Link key={venue.id} href={`/venues/${venue.slug || venue.id}`}>
              <Card hover className="p-4 cursor-pointer h-full text-left">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-vibe-gradient/20 flex items-center justify-center text-xl flex-shrink-0">
                    🎵
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-sm truncate">{venue.name}</h3>
                      <Badge variant="verified" className="text-[8px] px-1.5">✓</Badge>
                    </div>
                    <p className="text-xs text-vibe-text-secondary truncate">{tv('title')} · {venue.address || 'Zurigo'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-amber-400">⭐ {venue.vibe_score || '9.0'}</span>
                      <span className="text-xs text-green-400">● {tv('open')}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {filteredVenues.length === 0 && (
            <p className="text-sm text-vibe-text-secondary col-span-full text-center py-8 bg-white/5 rounded-2xl">
              {tv('noVenues')}
            </p>
          )}
        </div>
      </section>
    </>
  )}
</div>
  );
}
