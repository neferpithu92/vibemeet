'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { useMap } from 'react-map-gl/mapbox';

interface MapSearchResult {
  id: string;
  name?: string;
  title?: string;
  displayName?: string;
  longitude?: number;
  latitude?: number;
  venue?: {
    name: string;
    longitude: number;
    latitude: number;
  };
  type?: string;
  source?: 'internal' | 'mapbox';
}

export default function MapSearch() {
  const { current: map } = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MapSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        
        // 1. Ricerca interna (Venues/Events)
        const res = await fetch(`/api/discovery/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const internalResults = [...(data.venues || []), ...(data.events || [])].map(item => ({
          ...item,
          displayName: item.name || item.title,
          source: 'internal'
        }));

        // 2. Ricerca Geocoding (Città/Indirizzi)
        let geocodingResults: any[] = [];
        if (token) {
          const geoRes = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=3`
          );
          const geoData = await geoRes.json();
          geocodingResults = (geoData.features || []).map((f: any) => ({
            id: f.id,
            displayName: f.place_name,
            longitude: f.center[0],
            latitude: f.center[1],
            type: f.place_type[0],
            source: 'mapbox'
          }));
        }

        setResults([...internalResults, ...geocodingResults]);
      } catch (err) {
        console.error('Map search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: any) => {
    setQuery('');
    setResults([]);
    
    // Sposta la mappa sul risultato
    const lon = item.longitude || item.venue?.longitude;
    const lat = item.latitude || item.venue?.latitude;

    if (lon && lat && map) {
      map.flyTo({
        center: [lon, lat],
        zoom: item.source === 'mapbox' ? 12 : 16,
        duration: 2000
      });
    }
  };

  return (
    <div className="relative w-full max-w-sm">
      <div className="relative">
        <input
          type="text"
          placeholder="Cerca un locale, evento o città..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-field pl-10 h-10 text-sm bg-vibe-dark/60 backdrop-blur-md"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vibe-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <Card className="absolute top-12 left-0 right-0 z-50 max-h-60 overflow-y-auto p-2 bg-vibe-dark/90 backdrop-blur-xl border-white/10 shadow-2xl">
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 text-left transition-colors group"
            >
              <span className="text-xl">
                {item.source === 'mapbox' ? '📍' : (item.name ? '🏢' : '🎉')}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate group-hover:text-vibe-purple transition-colors">
                  {item.displayName}
                </p>
                <p className="text-[10px] text-vibe-text-secondary truncate uppercase tracking-wider">
                  {item.source === 'mapbox' ? 'Mappa' : (item.type || item.venue?.name || 'Evento')}
                </p>
              </div>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
