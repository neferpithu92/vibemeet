'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/lib/i18n/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { MapView } from '@/components/map/MapView';
import { VenueMarker, EventMarker, StoryMarker, PresenceMarker, MediaMarker } from '@/components/map/Markers';
import MapSearch from '@/components/map/MapSearch';
import HeatmapLayer from '@/components/map/HeatmapLayer';
import ActivityFeed from '@/components/social/ActivityFeed';
import { Compass, Crosshair, Map as MapIcon, Layers, Calendar, Users, TrendingUp, Clock, Navigation, Share2, Building2 } from 'lucide-react';

import { useMapRealtime } from '@/lib/supabase/useMapRealtime';
import { useUserLocation } from '@/hooks/useUserLocation';
import { createClient } from '@/lib/supabase/client';
import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton';
import CheckInButton from '@/components/social/CheckInButton';
import FollowButton from '@/components/social/FollowButton';

interface MapVenue {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  slug?: string;
  description?: string;
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

interface MapStory {
  id: string;
  media_url: string;
  caption?: string;
  location?: {
    coordinates: [number, number];
  };
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

interface MapUser {
  id: string;
  username: string;
  avatar_url: string;
  latitude: number;
  longitude: number;
}

interface MapMedia {
  id: string;
  media_url: string;
  thumbnail_url?: string;
  media_type?: string;
  caption?: string;
  location?: {
    coordinates: [number, number];
  };
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

/**
 * Pagina Mappa Interattiva — visualizza Mapbox con dati reali e real-time da Supabase.
 */
export default function MapPage() {
  const t = useTranslations('map');
  const te = useTranslations('events');
  const tv = useTranslations('venues');
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'today' | 'upcoming' | 'all'>('all');
  
  const [venues, setVenues] = useState<MapVenue[]>([]);
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [stories, setStories] = useState<MapStory[]>([]);
  const [media, setMedia] = useState<MapMedia[]>([]);
  const [users, setUsers] = useState<MapUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCentering, setIsCentering] = useState(false);
  
  const supabaseClient = createClient();

  // Attiva il tracciamento posizione utente
  useUserLocation();

  const [userPosition, setUserPosition] = useState<{ lat: number, lng: number } | null>(null);
  const mapRef = useRef<any>(null);
  const hasCentered = useRef(false);

  // Ottieni posizione iniziale con cache aggressiva (quasi istantaneo)
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    // Prima prova: posizione cached (risponde in <100ms se disponibile)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        // Seconda prova: GPS fresco con timeout aggressivo
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => console.warn('[Map] GPS non disponibile:', err.message),
          { enableHighAccuracy: false, timeout: 2500, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: false, timeout: 500, maximumAge: Infinity }
    );
  }, []);

  /**
   * centerOnMe — quasi istantaneo:
   * - Se la posizione è già in cache → fly immediato (0ms delay)
   * - Altrimenti → richiede GPS con timeout max 2.5s, poi fly
   */
  const centerOnMe = useCallback(() => {
    if (!mapRef.current) return;

    // Posizione già disponibile → centra SUBITO
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

    // Non disponibile → GPS rapido con feedback visivo
    if (!navigator.geolocation) return;
    setIsCentering(true);

    const timeout = setTimeout(() => setIsCentering(false), 3000); // safety

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
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
        clearTimeout(timeout);
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

  // Effetto per controllare se l'utente segue la venue selezionata
  useEffect(() => {
    async function checkFollow() {
      if (!selectedItem || selectedItem.type !== 'venue') {
        setIsFollowing(false);
        return;
      }
      
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      const { data: follow } = await supabaseClient
        .from('followers')
        .select('follower_id')
        .match({ 
          follower_id: user.id, 
          following_id: selectedItem.id, 
          entity_type: 'venue' 
        })
        .single();
      
      setIsFollowing(!!follow);
    }
    
    checkFollow();
  }, [selectedItem, supabaseClient]);
  
  // Ref per memorizzare gli ultimi bounds e ricaricare in tempo reale
  const currentBounds = useRef<{ sw: [number, number]; ne: [number, number] } | null>(null);

  /** Funzione core per recuperare i dati */
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

  // Refetch when filters change
  useEffect(() => {
    if (currentBounds.current) {
      fetchData(currentBounds.current);
    }
  }, [selectedGenres, dateFilter]);

  /** Abilita Realtime: quando il DB cambia, ricarica i dati dei bounds correnti */
  useMapRealtime(() => {
    if (currentBounds.current) {
      fetchData(currentBounds.current);
    }
  });

  /** Toggles per i layer della mappa */
  const toggleLayer = (id: string) => {
    setActiveLayers(prev => prev.map(l => 
      l.id === id ? { ...l, active: !l.active } : l
    ));
  };

  /** Fetch dati quando i bounds della mappa cambiano (manuale o trascinamento) */
  const handleBoundsChange = (bounds: { sw: [number, number]; ne: [number, number] }) => {
    fetchData(bounds);
  };

  const isLayerActive = (id: string) => activeLayers.find(l => l.id === id)?.active;

  return (
    <div className="relative h-[calc(100vh-64px)] w-full bg-vibe-dark overflow-hidden">
      {/* MAPPA REALE */}
      <MapView onBoundsChange={handleBoundsChange} ref={mapRef}>
        {/* Indicatore di caricamento asincrono */}
        {isLoading && (
          <div className="absolute top-20 right-4 z-50 flex flex-col gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        )}
        {/* Barra di ricerca Mappa */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-xs px-2 pointer-events-auto">
          <MapSearch />
        </div>

        {/* Heatmap Layer */}
        <HeatmapLayer visible={isLayerActive('heatmap') || false} />

        {/* Render markers per Venues */}
        {isLayerActive('venues') && venues.map(venue => (
          <VenueMarker 
            key={venue.id}
            longitude={venue.longitude}
            latitude={venue.latitude}
            isActive={selectedItem?.id === venue.id}
            onClick={() => setSelectedItem({ ...venue, type: 'venue' })}
          />
        ))}

        {/* Marker delle Storie */}
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

        {/* Marker del Feed Media (Post Personali) */}
        {isLayerActive('stories') && media.map((item) => {
          const coords = item.location?.coordinates || [0, 0];
          return (
            <MediaMarker
              key={item.id}
              longitude={coords[0]}
              latitude={coords[1]}
              mediaUrl={item.media_url}
              thumbnailUrl={item.thumbnail_url}
              mediaType={item.media_type}
              isActive={selectedItem?.id === item.id}
              onClick={() => setSelectedItem({ ...item, type: 'media' })}
            />
          );
        })}

        {/* Marker Utenti Vicini (Nearby People) */}
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

        {/* Render markers per Eventi */}
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

      {/* Layer Controls (Top Left) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <Card className="p-1.5 flex flex-col gap-1 w-fit">
          {activeLayers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => toggleLayer(layer.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-300 ${
                layer.active 
                  ? 'bg-vibe-purple/20 text-vibe-purple border border-vibe-purple/20' 
                  : 'bg-vibe-dark/40 text-vibe-text-secondary hover:bg-white/10'
              }`}
            >
              <span>{layer.icon}</span>
              <span className="hidden md:inline">{layer.label}</span>
            </button>
          ))}
        </Card>

        {/* Tasto Centra su di me — risposta <100ms se posizione in cache */}
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={centerOnMe}
          disabled={isCentering}
          className={`shadow-xl backdrop-blur-md border-white/10 transition-all
            ${isCentering
              ? 'bg-vibe-purple/20 border-vibe-purple/30'
              : 'bg-vibe-dark/80'}`}
        >
          <Crosshair className={`w-4 h-4 mr-2 ${isCentering ? 'animate-spin text-vibe-purple' : ''}`} />
          {isCentering ? '...' : t('centerOnMe')}
        </Button>

        {/* Tasto Filtri */}
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => setShowFilters(!showFilters)}
          className="shadow-xl bg-vibe-dark/80 backdrop-blur-md border-white/10"
        >
          <Layers className="w-4 h-4 mr-2" />
          {t('filters')}
        </Button>

        {/* Tasto Eventi Salvi */}
        <Link href="/saved">
          <Button 
            variant="secondary" 
            size="sm" 
            className="shadow-xl bg-vibe-dark/80 backdrop-blur-md border-white/10"
          >
            <MapIcon className="w-4 h-4 mr-2" />
            {t('saved')}
          </Button>
        </Link>
      </div>

      {/* Pannello Attività Live (Left Sidebar) */}
      {showActivity && (
        <Card className="absolute top-4 left-4 md:left-24 z-30 w-full max-w-[320px] p-0 animate-slide-in-left overflow-hidden bg-vibe-dark/95 backdrop-blur-2xl border-white/10 h-[70vh] flex flex-col">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-display font-bold text-lg">⚡ Live Activity</h3>
            <button onClick={() => setShowActivity(false)} className="text-vibe-text-secondary hover:text-white transition-colors">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ActivityFeed />
          </div>
        </Card>
      )}

      {/* Pannello Filtri (Left Sidebar) */}
      {showFilters && (
        <Card className="absolute top-4 left-32 z-20 w-72 p-6 animate-slide-in-left">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-lg">{t('filters')}</h3>
            <button onClick={() => setShowFilters(false)} className="text-vibe-text-secondary">✕</button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-vibe-text-secondary uppercase mb-3 text-left">{te('filters.genre')}</label>
              <div className="flex flex-wrap gap-2 text-left">
                {['Techno', 'House', 'Jazz', 'Hip-Hop', 'Pop'].map(g => (
                  <Badge 
                    key={g} 
                    className={`cursor-pointer transition-colors ${selectedGenres.includes(g) ? 'bg-vibe-purple/30 text-vibe-purple ring-1 ring-vibe-purple/50' : 'hover:bg-vibe-purple/20'}`}
                    onClick={() => setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                  >{g}</Badge>
                ))}
              </div>
            </div>
            
            <div className="text-left">
              <label className="block text-xs font-bold text-vibe-text-secondary uppercase mb-3">{te('filters.date')}</label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={dateFilter === 'today' ? 'primary' : 'ghost'} size="sm" className="text-xs" onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')}>{te('today')}</Button>
                <Button variant={dateFilter === 'upcoming' ? 'primary' : 'ghost'} size="sm" className="text-xs" onClick={() => setDateFilter(dateFilter === 'upcoming' ? 'all' : 'upcoming')}>{te('upcoming')}</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Pannello Dettaglio (Right Sidebar / Bottom Mobile) */}
      {selectedItem && (
        <Card className="absolute bottom-6 left-6 right-6 md:top-4 md:bottom-4 md:right-4 md:left-auto md:w-96 z-20 p-6 animate-slide-in-right overflow-y-auto max-h-[80vh] md:max-h-none text-left">
          <button 
            onClick={() => setSelectedItem(null)}
            className="absolute top-4 right-4 text-vibe-text-secondary hover:text-white"
          >
            ✕
          </button>

          {selectedItem.type === 'story' || selectedItem.type === 'media' ? (
            <div className="space-y-6">
              <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-vibe-dark border border-white/10 shadow-2xl">
                <img 
                  src={selectedItem.media_url} 
                  alt="Content" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 flex items-center gap-3 bg-black/40 backdrop-blur-md p-1.5 pr-4 rounded-full">
                  <Avatar size="sm" src={selectedItem.profiles?.avatar_url} fallback={selectedItem.profiles?.username || 'U'} />
                  <span className="text-xs font-bold text-white">@{selectedItem.profiles?.username}</span>
                </div>
              </div>
              <div className="space-y-4 p-2">
                <p className="text-sm leading-relaxed text-vibe-text">{selectedItem.caption || 'Live! ✨'}</p>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-vibe-pink">
                    {selectedItem.type === 'story' ? t('stories') : 'Post Feed'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="w-full aspect-[16/10] rounded-2xl bg-vibe-gradient/20 mb-4 overflow-hidden relative group shadow-2xl">
                  {selectedItem.type === 'venue' ? (
                     <div className="absolute inset-0 flex items-center justify-center bg-vibe-dark/40 backdrop-blur-[2px]">
                        <Building2 className="w-16 h-16 text-vibe-purple/40" />
                     </div>
                  ) : (
                     <div className="absolute inset-0 flex items-center justify-center bg-vibe-dark/40 backdrop-blur-[2px]">
                        <Calendar className="w-16 h-16 text-vibe-pink/40" />
                     </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge variant="live" className="animate-pulse">LIVE</Badge>
                    <Badge variant="verified">OFFICIAL</Badge>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl">
                      <TrendingUp className="w-3.5 h-3.5 text-vibe-cyan" />
                      <span className="text-xs font-bold text-white">Vibe High</span>
                    </div>
                  </div>
                </div>
                
                <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">{selectedItem.name || selectedItem.title}</h2>
                <div className="flex flex-col gap-1.5">
                  <p className="text-vibe-text-secondary text-sm flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 text-vibe-purple" />
                    {selectedItem.address || selectedItem.venue?.address || 'Indirizzo non disponibile'}
                  </p>
                  <p className="text-[11px] text-vibe-text-secondary font-medium flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400 font-bold uppercase tracking-wider">Aperto ora</span> • Chiusura ore 04:00
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center group hover:bg-vibe-pink/5 transition-colors">
                    <p className="text-[10px] text-vibe-text-secondary uppercase font-bold tracking-widest mb-1 group-hover:text-vibe-pink transition-colors">Vibe Score</p>
                    <p className="text-xl font-bold text-white flex items-center justify-center gap-1.5">
                       <span className="text-vibe-pink">9.8</span>
                       <span className="text-xs opacity-40">/10</span>
                    </p>
                  </div>
                  <div className="flex-1 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center group hover:bg-vibe-cyan/5 transition-colors">
                    <p className="text-[10px] text-vibe-text-secondary uppercase font-bold tracking-widest mb-1 group-hover:text-vibe-cyan transition-colors">{t('crowd')}</p>
                    <p className="text-xl font-bold text-white flex items-center justify-center gap-1.5">
                       <span className="text-vibe-cyan">75%</span>
                       <Users className="w-3.5 h-3.5 opacity-40" />
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <h3 className="font-bold text-sm mb-2 uppercase tracking-widest text-vibe-text-secondary flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" /> Info
                  </h3>
                  <p className="text-sm text-vibe-text leading-relaxed">
                    {selectedItem.description || 'Nessuna descrizione disponibile per questo locale. Carica un Vibe per mostrarci l\'atmosfera!'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link 
                    href={selectedItem.type === 'venue' ? `/venues/${selectedItem.slug || selectedItem.id}` : `/events/${selectedItem.id}`}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full font-bold">
                       Profilo
                    </Button>
                  </Link>
                  <Button variant="secondary" className="w-full font-bold flex items-center justify-center gap-2">
                    <Share2 className="w-4 h-4" /> Condividi
                  </Button>
                </div>

                <CheckInButton 
                  venueId={selectedItem.type === 'venue' ? selectedItem.id : undefined} 
                  eventId={selectedItem.type === 'event' ? selectedItem.id : undefined} 
                  className="w-full py-4 text-base font-bold shadow-vibe-purple/20 shadow-lg"
                />
              </div>
            </>
          )}
        </Card>
      )}

      {/* Indicatore di caricamento */}
      {isLoading && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 bg-vibe-dark/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-3 animate-fade-in">
          <div className="w-4 h-4 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">{tc('loading')}</span>
        </div>
      )}
    </div>
  );
}
