'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/lib/i18n/navigation';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Compass, Crosshair, Map as MapIcon, Layers, Calendar, Users, TrendingUp, Clock, Navigation, Share2, Building2, Search, X } from 'lucide-react';

import { useMapRealtime } from '@/lib/supabase/useMapRealtime';
import { useUserLocation } from '@/hooks/useUserLocation';
import { createClient } from '@/lib/supabase/client';
import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton';
import CheckInButton from '@/components/social/CheckInButton';

// Lazy load heavy map components
const MapView = dynamic(() => import('@/components/map/MapView').then(mod => mod.MapView), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-vibe-dark/50 animate-pulse flex items-center justify-center"><MapIcon className="w-12 h-12 text-vibe-purple/20" /></div>
});
const MapSearch = dynamic(() => import('@/components/map/MapSearch'), { ssr: false });
const HeatmapLayer = dynamic(() => import('@/components/map/HeatmapLayer'), { ssr: false });
const ActivityFeed = dynamic(() => import('@/components/social/ActivityFeed'), { ssr: false });

// Markers are relatively lightweight but we can still import them normally or lazy load if many
import { VenueMarker, EventMarker, StoryMarker, PresenceMarker, MediaMarker } from '@/components/map/Markers';

interface MapVenue {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  slug?: string;
  description?: string;
  vibe_score?: number;
  crowd_density?: number;
}

interface MapEvent {
  id: string;
  title: string;
  latitude?: number;
  longitude?: number;
  venue?: {
    latitude: number;
    longitude: number;
    name: string;
    address: string;
  };
  description?: string;
}

export default function MapPage() {
  const t = useTranslations('map');
  const te = useTranslations('events');
  const tc = useTranslations('common');
  
  const layers = [
    { id: 'heatmap', label: t('heatmap'), icon: '🔥', active: false },
    { id: 'venues', label: t('venues'), icon: '🏢', active: true },
    { id: 'events', label: t('events'), icon: '🎉', active: true },
    { id: 'stories', label: t('stories'), icon: '📱', active: true },
    { id: 'people', label: t('friends'), icon: '👥', active: true },
  ];

  const [activeLayers, setActiveLayers] = useState(layers);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'today' | 'upcoming' | 'all'>('all');
  
  const [venues, setVenues] = useState<MapVenue[]>([]);
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCentering, setIsCentering] = useState(false);
  
  const supabaseClient = createClient();

  useUserLocation();

  const [userPosition, setUserPosition] = useState<{ lat: number, lng: number } | null>(null);
  const mapRef = useRef<any>(null);
  const hasCentered = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => console.warn('[Map] GPS non disponibile:', err.message),
          { enableHighAccuracy: false, timeout: 2500, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: false, timeout: 500, maximumAge: Infinity }
    );
  }, []);

  const centerOnMe = useCallback(() => {
    if (!mapRef.current) return;

    if (userPosition) {
      mapRef.current.flyTo({
        center: [userPosition.lng, userPosition.lat],
        zoom: 15,
        duration: 800,
        pitch: 45,
      });
      hasCentered.current = true;
      return;
    }

    if (!navigator.geolocation) return;
    setIsCentering(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPosition(coords);
        mapRef.current?.flyTo({
          center: [coords.lng, coords.lat],
          zoom: 15,
          duration: 800,
          pitch: 45,
        });
        hasCentered.current = true;
        setIsCentering(false);
      },
      (err) => {
        console.warn('[Map] GPS error:', err.message);
        setIsCentering(false);
      },
      { enableHighAccuracy: false, timeout: 2500, maximumAge: 30000 }
    );
  }, [userPosition]);

  useEffect(() => {
    if (userPosition && mapRef.current && !hasCentered.current) {
      centerOnMe();
    }
  }, [userPosition, centerOnMe]);

  const currentBounds = useRef<{ sw: [number, number]; ne: [number, number] } | null>(null);

  const fetchData = async (bounds: { sw: [number, number]; ne: [number, number] }) => {
    setIsLoading(true);
    try {
      const genresParam = selectedGenres.length > 0 ? `&genres=${selectedGenres.join(',')}` : '';
      const dateParam = dateFilter !== 'all' ? `&date=${dateFilter}` : '';
      const res = await fetch(`/api/map/data?sw=${bounds.sw.join(',')}&ne=${bounds.ne.join(',')}${genresParam}${dateParam}`);
      const data = await res.json();
      if (data.venues) setVenues(data.venues);
      if (data.events) setEvents(data.events);
      if (data.stories) setStories(data.stories);
      if (data.media) setMedia(data.media);
      if (data.users) setUsers(data.users);
      currentBounds.current = bounds;
    } catch (err) {
      console.error('Errore caricamento dati mappa:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentBounds.current) {
      fetchData(currentBounds.current);
    }
  }, [selectedGenres, dateFilter]);

  useMapRealtime(() => {
    if (currentBounds.current) {
      fetchData(currentBounds.current);
    }
  });

  const toggleLayer = (id: string) => {
    setActiveLayers(prev => prev.map(l => 
      l.id === id ? { ...l, active: !l.active } : l
    ));
  };

  const handleBoundsChange = (bounds: { sw: [number, number]; ne: [number, number] }) => {
    fetchData(bounds);
  };

  const isLayerActive = (id: string) => activeLayers.find(l => l.id === id)?.active;

  return (
    <div className="relative h-[calc(100vh-64px)] w-full bg-vibe-dark overflow-hidden gpu-accelerated">
      <MapView onBoundsChange={handleBoundsChange} ref={mapRef}>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-xs px-2 pointer-events-auto">
          <MapSearch />
        </div>

        <HeatmapLayer visible={isLayerActive('heatmap') || false} />

        {isLayerActive('venues') && venues.map(venue => (
          <VenueMarker 
            key={venue.id}
            longitude={venue.longitude}
            latitude={venue.latitude}
            isActive={selectedItem?.id === venue.id}
            onClick={() => setSelectedItem({ ...venue, type: 'venue' })}
          />
        ))}

        {isLayerActive('stories') && stories.map((story) => {
          const coords = story.location?.coordinates || [0, 0];
          return (
            <StoryMarker
              key={story.id}
              longitude={coords[0]}
              latitude={coords[1]}
              avatarUrl={story.profiles?.avatar_url}
              username={story.profiles?.username}
              isActive={selectedItem?.id === story.id}
              onClick={() => setSelectedItem({ ...story, type: 'story' })}
            />
          );
        })}

        {isLayerActive('people') && users.map((user) => (
          <PresenceMarker
            key={user.id}
            longitude={user.longitude}
            latitude={user.latitude}
            username={user.username}
            avatarUrl={user.avatar_url}
            onClick={() => setSelectedItem({ ...user, type: 'user' })}
          />
        ))}

        {isLayerActive('events') && events.map(event => (
          <EventMarker 
            key={event.id}
            longitude={event.venue?.longitude || event.longitude || 0}
            latitude={event.venue?.latitude || event.latitude || 0}
            isActive={selectedItem?.id === event.id}
            onClick={() => setSelectedItem({ ...event, type: 'event' })}
          />
        ))}
      </MapView>

      {/* Layer Controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <Card className="p-1.5 flex flex-col gap-1 w-fit glass-card-static">
          {activeLayers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => toggleLayer(layer.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 interactive-hover ${
                layer.active 
                  ? 'bg-vibe-purple/20 text-vibe-purple border border-vibe-purple/20' 
                  : 'bg-vibe-dark/40 text-vibe-text-secondary'
              }`}
            >
              <span>{layer.icon}</span>
              <span className="hidden md:inline">{layer.label}</span>
            </button>
          ))}
        </Card>

        <Button 
          variant="secondary" 
          size="sm" 
          onClick={centerOnMe}
          disabled={isCentering}
          className="shadow-xl bg-vibe-dark/80 backdrop-blur-md border-white/10 interactive-hover"
        >
          <Crosshair className={`w-4 h-4 mr-2 ${isCentering ? 'animate-spin text-vibe-purple' : ''}`} />
          {isCentering ? '...' : t('centerOnMe')}
        </Button>

        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => setShowFilters(!showFilters)}
          className="shadow-xl bg-vibe-dark/80 backdrop-blur-md border-white/10 interactive-hover"
        >
          <Layers className="w-4 h-4 mr-2" />
          {t('filters')}
        </Button>
      </div>

      {/* Activity Panel */}
      {showActivity && (
        <Card className="absolute top-4 left-4 md:left-24 z-30 w-full max-w-[320px] p-0 overflow-hidden bg-vibe-dark/95 backdrop-blur-2xl border-white/10 h-[70vh] flex flex-col gpu-accelerated animate-slide-in-left">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-display font-bold text-lg">⚡ Live Activity</h3>
            <button onClick={() => setShowActivity(false)} className="interactive-hover"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ActivityFeed />
          </div>
        </Card>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card className="absolute top-4 left-32 z-20 w-72 p-6 bg-vibe-dark/95 backdrop-blur-2xl border-white/10 gpu-accelerated animate-slide-in-left">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-lg uppercase tracking-tighter">{t('filters')}</h3>
            <button onClick={() => setShowFilters(false)} className="interactive-hover"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-vibe-text-secondary uppercase mb-3 tracking-[0.2em]">{te('filters.genre')}</label>
              <div className="flex flex-wrap gap-2">
                {['Techno', 'House', 'Jazz', 'Hip-Hop', 'Pop'].map(g => (
                  <Badge 
                    key={g} 
                    className={`cursor-pointer transition-all tap-scale ${selectedGenres.includes(g) ? 'bg-vibe-purple/30 text-vibe-purple ring-1 ring-vibe-purple/50' : 'bg-white/5 hover:bg-white/10'}`}
                    onClick={() => setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                  >{g}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Detail Panel */}
      {selectedItem && (
        <Card className="absolute bottom-6 left-6 right-6 md:top-4 md:bottom-4 md:right-4 md:left-auto md:w-96 z-20 p-6 overflow-y-auto max-h-[80vh] md:max-h-none text-left bg-vibe-dark/95 backdrop-blur-2xl border-white/10 gpu-accelerated animate-slide-in-right">
          <button 
            onClick={() => setSelectedItem(null)}
            className="absolute top-4 right-4 interactive-hover"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-6">
            <div className="w-full aspect-[16/10] rounded-2xl bg-vibe-gradient/20 mb-4 overflow-hidden relative shadow-2xl">
              {selectedItem.type === 'venue' ? (
                <div className="absolute inset-0 flex items-center justify-center bg-vibe-dark/40">
                  <Building2 className="w-16 h-16 text-vibe-purple/20" />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-vibe-dark/40">
                  <Calendar className="w-16 h-16 text-vibe-pink/20" />
                </div>
              )}
            </div>
            
            <h2 className="font-display text-2xl font-black vibe-gradient-text tracking-tighter">{selectedItem.name || selectedItem.title}</h2>
            <p className="text-vibe-text-secondary text-sm flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 text-vibe-purple" />
              {selectedItem.address || selectedItem.venue?.address || 'Indirizzo non disponibile'}
            </p>

            <div className="flex gap-4">
              <div className="flex-1 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[9px] text-vibe-text-secondary uppercase font-black tracking-widest mb-1">Vibe Score</p>
                <p className="text-xl font-black text-vibe-pink">
                  {selectedItem.vibe_score ? Number(selectedItem.vibe_score).toFixed(1) : '5.0'}
                </p>
              </div>
              <div className="flex-1 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[9px] text-vibe-text-secondary uppercase font-black tracking-widest mb-1">{t('crowd')}</p>
                <p className="text-xl font-black text-vibe-cyan">
                  {selectedItem.crowd_density ?? 25}%
                </p>
              </div>
            </div>

            <CheckInButton 
              venueId={selectedItem.type === 'venue' ? selectedItem.id : undefined} 
              eventId={selectedItem.type === 'event' ? selectedItem.id : undefined} 
              className="w-full py-4 text-sm font-black uppercase tracking-widest shadow-vibe-purple/20 shadow-lg interactive-hover"
            />
          </div>
        </Card>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 bg-vibe-dark/90 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/10 flex items-center gap-3 animate-fade-in shadow-2xl">
          <div className="w-4 h-4 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{tc('loading')}</span>
        </div>
      )}
    </div>
  );
}
