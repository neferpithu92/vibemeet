'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

interface LocationPickerProps {
  value: { lat: number; lng: number; name?: string; venue_id?: string } | null;
  onChange: (loc: { lat: number; lng: number; name?: string; venue_id?: string }) => void;
  required?: boolean;
}

interface NearbyVenue {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export function LocationPicker({ value, onChange, required = false }: LocationPickerProps) {
  const t = useTranslations('common.location');
  const supabase = createClient();
  const [isSearching, setIsSearching] = useState(false);
  const [nearbyVenues, setNearbyVenues] = useState<NearbyVenue[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);

  useEffect(() => {
    if (!value) {
      handleGPSDetect();
    }
  }, []);

  const handleGPSDetect = useCallback(() => {
    setIsSearching(true);
    setError(null);

    if (!navigator.geolocation) {
      setError(t('geoNotSupported'));
      setIsSearching(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        if (!value) {
          onChange({ lat: latitude, lng: longitude });
        }

        try {
          const { data: venues } = await (supabase as any).rpc('get_venues_in_bounds', {
            min_lat: latitude - 0.002, max_lat: latitude + 0.002,
            min_lng: longitude - 0.002, max_lng: longitude + 0.002
          });
          
          if (venues && venues.length > 0) {
            setNearbyVenues(venues.slice(0, 5));
            if (!value) {
              onChange({
                lat: latitude,
                lng: longitude,
                name: venues[0].name,
                venue_id: venues[0].id,
              });
            }
          }
        } catch (err) {
          console.error("GPS Venue detection failed", err);
        } finally {
          setIsSearching(false);
        }
      },
      (err) => {
        setError(t('geoDenied'));
        setIsSearching(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [value, onChange, supabase, t]);

  // Combined Search (Venues + Mapbox)
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setNearbyVenues([]);
      return;
    }
    
    const t_out = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        
        // 1. Search existing Venues in VIBE DB
        const { data: dbVenues } = await supabase
          .from('venues')
          .select('id, name, address, location')
          .ilike('name', `%${searchQuery}%`)
          .limit(3);

        const mappedDbVenues: NearbyVenue[] = (dbVenues || []).map(v => {
          // Supabase returns PostGIS geography as GeoJSON or object
          const loc = v.location as any;
          let lat = 47.3769;
          let lng = 8.5417;

          if (loc && loc.coordinates) {
            lng = loc.coordinates[0];
            lat = loc.coordinates[1];
          } else if (typeof loc === 'string') {
            // Handle POINT(lng lat) string
            const matches = loc.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
            if (matches) {
              lng = parseFloat(matches[1]);
              lat = parseFloat(matches[2]);
            }
          }

          return {
            id: v.id,
            name: v.name,
            address: v.address,
            lat,
            lng,
            isDbVenue: true
          };
        });

        // 2. Search Mapbox Places
        let mapboxVenues: NearbyVenue[] = [];
        if (token && !token.startsWith('pk.insert')) {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json` +
            `?access_token=${token}` +
            `&proximity=8.5417,47.3769` + 
            `&country=ch&limit=5`
          );
          const data = await res.json();
          if (data.features) {
            mapboxVenues = data.features.map((f: any) => ({
              id: f.id,
              name: f.text,
              address: f.place_name,
              lng: f.center[0],
              lat: f.center[1],
              isDbVenue: false
            }));
          }
        }

        // Combine and deduplicate if necessary
        setNearbyVenues([...mappedDbVenues, ...mapboxVenues]);
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        setLoadingSearch(false);
      }
    }, 400);
    return () => clearTimeout(t_out);
  }, [searchQuery, supabase]);

  return (
    <div className="w-full bg-white/5 border border-white/10 p-4 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-vibe-text">
          📍 {t('title')} {required && <span className="text-red-400">*</span>}
        </label>
        <button 
          type="button"
          disabled={isSearching}
          onClick={handleGPSDetect}
          className="text-xs text-vibe-purple hover:text-vibe-pink font-medium flex items-center gap-1"
        >
          {isSearching ? (
            <div className="w-3 h-3 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
          ) : (
            `🎯 ${t('useGps')}`
          )}
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      {value?.name ? (
        <div className="flex items-center justify-between p-3 bg-vibe-purple/20 rounded-lg border border-vibe-purple/30">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <div>
              <p className="font-semibold text-sm text-vibe-text">{value.name}</p>
              <p className="text-xs text-vibe-text-secondary opacity-80">
                {t('selectedForPost')}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => onChange({ lat: value.lat, lng: value.lng, name: undefined, venue_id: undefined })}
            className="text-xs bg-white/10 px-2 py-1 rounded-md hover:bg-red-500/20 hover:text-red-400 transition-colors"
          >
            {t('remove')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-vibe-dark/50 border border-white/10 text-sm focus:border-vibe-purple transition-all outline-none focus:ring-1 focus:ring-vibe-purple/50"
            />
            
            {loadingSearch && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-vibe-purple/30 border-t-vibe-purple rounded-full animate-spin" />
              </div>
            )}
            
            {nearbyVenues.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 z-[60] glass-card overflow-hidden shadow-2xl animate-fade-in max-h-[240px] overflow-y-auto">
                {nearbyVenues.map((venue, idx) => (
                  <button
                    key={venue.id || idx}
                    type="button"
                    onClick={() => {
                      onChange({
                        lat: venue.lat,
                        lng: venue.lng,
                        name: venue.name,
                        venue_id: (venue as any).isDbVenue ? venue.id : undefined
                      });
                      setSearchQuery('');
                      setNearbyVenues([]);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-vibe-purple/20 transition-colors text-left border-b border-white/5 last:border-0"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${(venue as any).isDbVenue ? 'bg-vibe-purple/30' : 'bg-white/10'}`}>
                      {(venue as any).isDbVenue ? '🏢' : '📍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-vibe-text truncate">{venue.name}</p>
                      <p className="text-[10px] text-vibe-text-secondary truncate">
                        {(venue as any).address || (venue as any).isDbVenue ? 'Venue Registrata' : 'Luogo Mappa'}
                      </p>
                    </div>
                    {(venue as any).isDbVenue && (
                      <span className="text-[8px] bg-vibe-purple/20 text-vibe-purple px-1.5 py-0.5 rounded font-black uppercase">Vibe</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
