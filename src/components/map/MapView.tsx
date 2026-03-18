'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Map, NavigationControl, GeolocateControl, Marker, MapProvider, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  children?: React.ReactNode;
  onBoundsChange?: (bounds: { sw: [number, number]; ne: [number, number] }) => void;
}

interface MapContent {
  id: string;
  type: string;
  thumbnail_url: string;
  lat: number;
  lng: number;
  venue_name?: string;
  like_count: number;
  author_username: string;
}

/**
 * Componente Mappa Core — visualizza la mappa Mapbox e i contenuti degli utenti (Vibes/Foto).
 */
export const MapView = forwardRef<MapRef, MapViewProps>(({ 
  initialViewState = {
    longitude: 8.5417, // Zurigo
    latitude: 47.3769,
    zoom: 13
  },
  children,
  onBoundsChange
}, ref) => {
  const mapRef = useRef<MapRef>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [contentPins, setContentPins] = useState<MapContent[]>([]);
  const [center, setCenter] = useState({ lat: initialViewState.latitude, lng: initialViewState.longitude });

  // Expose the internal mapRef to parent via standard ref
  useImperativeHandle(ref, () => mapRef.current as MapRef, [isLoaded]);

  // Fetch content pins in the current area
  const fetchMapContent = useCallback(async (lat: number, lng: number) => {
    try {
      // In production, this would call our Supabase RPC get_map_content via an API route
      const res = await fetch(`/api/map/content?lat=${lat}&lng=${lng}&radius=5`);
      if (res.ok) {
        const data = await res.json();
        setContentPins(data.content || []);
      }
    } catch (err) {
      console.error('Failed to fetch map content pins', err);
    }
  }, []);

  const handleMapLoad = useCallback((e: any) => {
    setIsLoaded(true);
    // Initial fetch
    fetchMapContent(initialViewState.latitude, initialViewState.longitude);
  }, [initialViewState, fetchMapContent]);

  const handleMoveEnd = useCallback((e: any) => {
    if (!mapRef.current) return;
    
    const bounds = mapRef.current.getBounds();
    const newCenter = mapRef.current.getCenter();
    
    setCenter({ lat: newCenter.lat, lng: newCenter.lng });
    fetchMapContent(newCenter.lat, newCenter.lng);

    if (onBoundsChange && bounds) {
      onBoundsChange({
        sw: [bounds.getWest(), bounds.getSouth()],
        ne: [bounds.getEast(), bounds.getNorth()]
      });
    }
  }, [onBoundsChange, fetchMapContent]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token || token.startsWith('pk.insert')) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-vibe-dark border border-white/5 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-vibe-gradient/20 flex items-center justify-center mb-4">
          <span className="text-3xl">🗺️</span>
        </div>
        <h3 className="text-xl font-bold mb-2">Configurazione Mappa Necessaria</h3>
        <p className="text-vibe-text-secondary max-w-sm mb-6">
          Per visualizzare la mappa interattiva, inserisci il tuo **Mapbox Public Token** nel file `.env.local`.
        </p>
        <code className="bg-white/5 px-4 py-2 rounded-lg text-xs font-mono border border-white/10 mb-6">
          NEXT_PUBLIC_MAPBOX_TOKEN=pk....
        </code>
        <a 
          href="https://www.mapbox.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-vibe-purple hover:text-vibe-pink text-sm font-medium transition-colors"
        >
          Ottieni un token gratuito su mapbox.com →
        </a>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <MapProvider>
        <Map
          ref={mapRef}
          initialViewState={initialViewState}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          mapboxAccessToken={token}
          onMoveEnd={handleMoveEnd}
          onLoad={handleMapLoad}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" />
          <GeolocateControl 
            position="top-right" 
            trackUserLocation 
            showUserHeading
          />
          
          {/* Content Pins (Vibes/Photos) dynamically loaded based on center */}
          {isLoaded && contentPins.map((pin) => (
            <Marker key={pin.id} latitude={pin.lat} longitude={pin.lng} anchor="bottom">
              <div className="group relative cursor-pointer transform hover:scale-110 transition-transform duration-200">
                <div className="w-12 h-14 bg-vibe-dark border-2 border-vibe-purple rounded-xl p-1 shadow-lg flex items-center justify-center overflow-hidden">
                  {pin.thumbnail_url ? (
                    <img src={pin.thumbnail_url} alt={pin.author_username} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <span className="text-xl">{pin.type === 'video' ? '🎬' : '📷'}</span>
                  )}
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-white text-black p-2 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                  <p className="truncate">@{pin.author_username}</p>
                  {pin.venue_name && <p className="truncate text-vibe-purple font-bold text-[10px]">{pin.venue_name}</p>}
                </div>
                {/* Pointer tip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-vibe-purple"></div>
              </div>
            </Marker>
          ))}

          {isLoaded && children}
        </Map>
      </MapProvider>

      {/* Overlay caricamento */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-vibe-dark/50 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vibe-purple"></div>
        </div>
      )}
    </div>
  );
});

MapView.displayName = 'MapView';
