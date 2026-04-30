'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  type: string | null;
  slug: string | null;
  address: string | null;
  vibe_score: number | null;
}

interface DiscoveryEvent {
  id: string;
  title: string;
  category: string | null;
  starts_at: string;
  ends_at: string | null;
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
  count: number;
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
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Categories Horizontal Scroll */}
            <div className="flex gap-3 mb-10 overflow-x-auto hide-scrollbar pb-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex flex-col items-center gap-3 min-w-[100px] p-4 rounded-2xl transition-all duration-500
                    ${activeCategory === cat.id
                      ? 'bg-vibe-purple text-white shadow-lg shadow-vibe-purple/40 scale-105'
                      : 'bg-white/5 text-vibe-text-secondary hover:bg-white/10'
                    }`}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-center">
                    {t(`categories.${cat.id}`)}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Column: Trending & People */}
              <div className="md:col-span-2 space-y-10">
                {/* Trending Events */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-display font-black flex items-center gap-2">
                      <Compass className="w-5 h-5 text-vibe-pink" /> 
                      {t('trending')}
                    </h2>
                    <Link href="/events" className="text-xs text-vibe-pink font-bold uppercase tracking-widest hover:underline">Vedi Tutti</Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {events.slice(0, 4).map((event, idx) => (
                      <Link key={event.id} href={`/events/${event.id}`}>
                        <Card hover padding="none" className="overflow-hidden group relative h-48 rounded-3xl border-transparent hover:border-white/20 transition-all">
                          <div className="absolute inset-0 bg-vibe-gradient opacity-10 group-hover:opacity-30 transition-opacity" />
                          <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-vibe-dark via-vibe-dark/80 to-transparent">
                            <Badge variant="live" className="mb-2">POPULAR</Badge>
                            <h3 className="font-display font-black text-lg text-white mb-1 leading-tight">{event.title}</h3>
                            <p className="text-xs text-white/60 font-medium">@{(Array.isArray(event.venue) ? event.venue[0]?.name : event.venue?.name) || 'Vibe Venue'}</p>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>

                {/* Nearby Venues */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-display font-black flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-vibe-cyan" /> 
                      {t('nearbyVenues')}
                    </h2>
                    <Link href="/map" className="text-xs text-vibe-cyan font-bold uppercase tracking-widest hover:underline">Esplora Mappa</Link>
                  </div>
                  <div className="space-y-3">
                    {filteredVenues.slice(0, 5).map((venue) => (
                      <Link key={venue.id} href={`/venues/${venue.slug || venue.id}`}>
                        <div className="group flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                          <div className="w-14 h-14 rounded-2xl bg-vibe-gradient flex items-center justify-center text-2xl shadow-lg shadow-vibe-purple/20">
                            🏢
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white group-hover:text-vibe-cyan transition-colors truncate">{venue.name}</h3>
                            <p className="text-xs text-white/40 truncate">{venue.address || 'Zurigo'}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[10px] font-bold text-amber-400">★ {venue.vibe_score || '9.2'}</span>
                              <span className="text-[10px] font-bold text-green-400 uppercase tracking-tighter">● Open Now</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-vibe-cyan transition-all" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              </div>

              {/* Sidebar: Trending Hashtags & Discovery Meta */}
              <div className="space-y-10">
                <section>
                  <h2 className="text-lg font-display font-black mb-6 uppercase tracking-wider flex items-center gap-2 text-vibe-purple">
                    <Hash className="w-5 h-5" /> In Tendenza
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {trendingHashtags.length > 0 ? trendingHashtags.map((tag) => (
                      <HashtagBadge 
                        key={tag.tag} 
                        tag={tag.tag} 
                        count={tag.count} 
                        size="md"
                        className="hover:scale-110 transition-transform"
                      />
                    )) : (
                      <div className="w-full text-center py-8 border-2 border-dashed border-white/5 rounded-3xl opacity-30">
                        <Hash className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">In arrivo...</p>
                      </div>
                    )}
                  </div>
                </section>

                <Card className="bg-gradient-to-br from-vibe-purple/20 to-vibe-pink/20 border-white/10 p-6 rounded-[2rem]">
                  <h3 className="text-lg font-display font-black text-white mb-3">VIBE ENGINE™</h3>
                  <p className="text-xs text-white/60 leading-relaxed mb-6">
                    Scopri contenuti e luoghi basati sulle tue passioni. L'algoritmo impara dai tuoi Vibe.
                  </p>
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/5 flex items-center gap-3 shadow-inner">
                    <div className="w-2 h-2 rounded-full bg-vibe-cyan animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-vibe-cyan">Ottimizzato per te</span>
                  </div>
                </Card>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
