'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { HashtagBadge } from '@/components/ui/HashtagBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronRight, Compass, Users, MapPin, Calendar, Music, Hash, Search } from 'lucide-react';

interface DiscoveryVenue {
  id: string;
  name: string;
  type?: string;
  slug?: string;
  address?: string;
  vibe_score?: number;
}

interface DiscoveryEvent {
  id: string;
  title: string;
  category?: string;
  start_time: string;
  end_time: string;
  venue?: any;
}

interface DiscoveryCategory {
  id: string;
  icon: string;
}

interface DiscoveryClientProps {
  venues: DiscoveryVenue[];
  events: DiscoveryEvent[];
  categories: DiscoveryCategory[];
}

interface SearchResults {
  users: any[];
  events: any[];
  venues: any[];
  artists: any[];
  hashtags: any[];
}

interface TrendingHashtag {
  tag: string;
  post_count: number;
  score?: number;
}

export default function DiscoveryClient({ venues, events, categories }: DiscoveryClientProps) {
  const t = useTranslations('explore');
  const tc = useTranslations('common');
  const te = useTranslations('events');
  const tv = useTranslations('venues');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'venues' | 'events' | 'artists' | 'hashtags'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const locale = useLocale();
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);

  // Fetch trending hashtags on mount
  useEffect(() => {
    async function fetchTrending() {
      try {
        const res = await fetch('/api/hashtags/trending?city=global&period=24h&limit=10');
        if (res.ok) {
          const data = await res.json();
          setTrendingHashtags(data.hashtags || []);
        }
      } catch {
        // Silently fail — trending section will just be empty
      }
    }
    fetchTrending();
  }, []);

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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-vibe-text-secondary" />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Search Results Overlay / Section */}
      {searchResults && searchQuery.length >= 2 && (
        <div className="mb-12 space-y-6 animate-fade-in">
          {/* Tabs di Ricerca */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {[
              { id: 'all', label: 'TUTTO', icon: <Search className="w-3.5 h-3.5" /> },
              { id: 'users', label: 'PERSONE', icon: <Users className="w-3.5 h-3.5" /> },
              { id: 'venues', label: 'VENUE', icon: <MapPin className="w-3.5 h-3.5" /> },
              { id: 'events', label: 'EVENTI', icon: <Calendar className="w-3.5 h-3.5" /> },
              { id: 'artists', label: 'ARTISTI', icon: <Music className="w-3.5 h-3.5" /> },
              { id: 'hashtags', label: 'HASHTAG', icon: <Hash className="w-3.5 h-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-vibe-purple text-white'
                    : 'bg-white/5 text-vibe-text-secondary hover:bg-white/10'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-8 mt-4">
            {/* Sezione PERSONE */}
            {(activeTab === 'all' || activeTab === 'users') && searchResults.users.length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-vibe-text-secondary">Persone</h2>
                  {activeTab === 'all' && (
                    <button onClick={() => setActiveTab('users')} className="text-xs text-vibe-purple">Vedi tutti</button>
                  )}
                </div>
                <div className="space-y-1">
                  {searchResults.users.map((user) => (
                    <Link key={user.id} href={`/u/${user.username}`}>
                      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                        <div className="relative">
                          <Avatar 
                            src={user.avatar_url} 
                            fallback={user.username[0]} 
                            size="md" 
                          />
                          {user.is_verified && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-vibe-purple rounded-full flex items-center justify-center border-2 border-vibe-dark">
                              <span className="text-[8px] text-white">✓</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="font-semibold text-sm truncate">
                              {user.display_name || user.username}
                            </p>
                            {user.is_verified && (
                              <span className="text-vibe-purple text-xs">✓</span>
                            )}
                          </div>
                          <p className="text-xs text-vibe-text-secondary">
                            @{user.username}
                          </p>
                          {user.bio && (
                            <p className="text-xs text-vibe-text-secondary truncate mt-0.5">
                              {user.bio}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-vibe-text-secondary" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Sezione EVENTI */}
            {(activeTab === 'all' || activeTab === 'events') && searchResults.events.length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-vibe-text-secondary">Eventi</h2>
                  {activeTab === 'all' && (
                    <button onClick={() => setActiveTab('events')} className="text-xs text-vibe-purple">Vedi tutti</button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {searchResults.events.map(event => (
                    <Link key={event.id} href={`/events/${event.id}`}>
                      <Card hover className="p-4 flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-xl bg-vibe-purple/10 flex items-center justify-center text-xl">🎉</div>
                        <div className="text-left flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{event.title}</h4>
                          <p className="text-xs text-vibe-text-secondary truncate">{event.venue?.name || 'VIBE Venue'}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-vibe-text-secondary" />
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Sezione VENUE */}
            {(activeTab === 'all' || activeTab === 'venues') && searchResults.venues.length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-vibe-text-secondary">Venue</h2>
                  {activeTab === 'all' && (
                    <button onClick={() => setActiveTab('venues')} className="text-xs text-vibe-purple">Vedi tutti</button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {searchResults.venues.map(v => (
                    <Link key={v.id} href={`/venues/${v.slug || v.id}`}>
                      <Card hover className="p-4 flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-xl bg-vibe-cyan/10 flex items-center justify-center text-xl">🏢</div>
                        <div className="text-left flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{v.name}</h4>
                          <p className="text-xs text-vibe-text-secondary truncate">{v.city || 'Zurigo'}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-vibe-text-secondary" />
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Empty State Ricerca */}
            {searchResults.events.length === 0 && 
             searchResults.venues.length === 0 && 
             searchResults.users.length === 0 && 
             searchResults.artists.length === 0 && 
             searchResults.hashtags.length === 0 && (
              <EmptyState
                icon={Search}
                title={tc('noContent')}
                description={t('tryDifferentQuery')}
              />
            )}
          </div>
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
                  <p className="text-xs text-vibe-text-secondary truncate">
                    {(Array.isArray(event.venue) ? event.venue[0]?.name : event.venue?.name) || 'Venue'}
                  </p>
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
