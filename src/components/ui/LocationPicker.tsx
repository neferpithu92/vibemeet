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

  // Handle mapbox geocoding search
  useEffect(() => {
    if (!searchQuery) return;
    const t_out = setTimeout(async () => {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!token || token.startsWith('pk.insert')) return;
        
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json` +
          `?access_token=${token}` +
          `&proximity=8.5417,47.3769` + 
          `&country=ch&limit=5`
        );
        const data = await res.json();
        if (data.features) {
          const mapboxVenues = data.features.map((f: { id: string; text: string; center: [number, number] }) => ({
            id: f.id,
            name: f.text,
            lng: f.center[0],
            lat: f.center[1]
          }));
          setNearbyVenues(mapboxVenues);
        }
      } catch (e) {
        console.error(e);
      }
    }, 500);
    return () => clearTimeout(t_out);
  }, [searchQuery]);

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
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-vibe-dark/50 border border-white/10 text-sm focus:border-vibe-purple transition-colors outline-none"
          />
          
          {nearbyVenues.length > 0 && (
            <div>
              <p className="text-xs text-vibe-text-secondary mb-2">{t('resultsSuggestions')}</p>
              <div className="flex flex-wrap gap-2">
                {nearbyVenues.map((venue, idx) => (
                  <button
                    key={venue.id || idx}
                    type="button"
                    onClick={() => onChange({
                      lat: venue.lat,
                      lng: venue.lng,
                      name: venue.name,
                      venue_id: venue.id.includes('.') ? undefined : venue.id // Mapbox IDs have dots
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-vibe-purple/20 hover:border-vibe-purple/30 text-xs font-medium transition-colors"
                  >
                    <span>🏢</span>
                    <span className="truncate max-w-[120px]">{venue.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
