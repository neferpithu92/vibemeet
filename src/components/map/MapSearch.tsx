'use client';

import { useState, useEffect, memo } from 'react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Link } from '@/lib/i18n/navigation';
import { useMap } from 'react-map-gl/mapbox';
import { useTranslations, useLocale } from 'next-intl';
import { User, MapPin, Calendar, Building2, Search } from 'lucide-react';

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

const MapSearch = memo(() => {
  const t = useTranslations('map');
  const tn = useTranslations('nav');
  const locale = useLocale();
  const { current: map } = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
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
        
        const res = await fetch(`/api/discovery/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        const internalResults = [
          ...(data.venues || []), 
          ...(data.events || [])
        ].map(item => ({
          ...item,
          displayName: item.name || item.title,
          source: 'internal'
        }));

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
        zoom: item.source === 'mapbox' ? 14 : 17,
        duration: 1200,
        essential: true
      });
    }
  };

  return (
    <div className="relative w-full max-w-sm gpu-accelerated">
      <div className="relative group">
        <input
          type="text"
          placeholder="Cerca luoghi ed eventi..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-field pl-10 h-11 text-sm bg-vibe-dark/60 backdrop-blur-xl border-white/10 focus:border-vibe-purple/50 transition-all"
        />
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-vibe-text-secondary group-focus-within:text-vibe-purple transition-colors" />
        {isSearching && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <Card className="absolute top-13 left-0 right-0 z-50 max-h-80 overflow-y-auto p-2 bg-vibe-dark/95 backdrop-blur-2xl border-white/10 shadow-2xl space-y-1 gpu-accelerated animate-fade-in rounded-2xl">
          <p className="text-[10px] font-black text-vibe-text-secondary px-3 py-2 uppercase tracking-[0.2em] opacity-60">
            Risultati Scoperta
          </p>
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 text-left transition-all group tap-scale active:bg-white/10"
            >
              <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">
                {item.source === 'mapbox' ? <MapPin className="w-4 h-4 text-vibe-purple" /> : (item.name ? <Building2 className="w-4 h-4 text-vibe-cyan" /> : <Calendar className="w-4 h-4 text-vibe-pink" />)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate group-hover:text-vibe-purple transition-colors">
                  {item.displayName}
                </p>
                <p className="text-[10px] text-vibe-text-secondary truncate uppercase font-black tracking-widest mt-0.5">
                  {item.source === 'mapbox' ? 'Mappa' : (item.type || item.venue?.name || 'Evento')}
                </p>
              </div>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
});

MapSearch.displayName = 'MapSearch';
export default MapSearch;
