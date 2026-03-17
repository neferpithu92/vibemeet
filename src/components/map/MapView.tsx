'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Map, NavigationControl, GeolocateControl, MapProvider, type MapRef } from 'react-map-gl/mapbox';
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

/**
 * Componente Mappa Core — visualizza la mappa Mapbox.
 * Gestisce il caricamento, lo stile dark e i cambiamenti di vista.
 */
export function MapView({ 
  initialViewState = {
    longitude: 8.5417, // Zurigo
    latitude: 47.3769,
    zoom: 13
  },
  children,
  onBoundsChange
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleMoveEnd = useCallback(() => {
    if (!mapRef.current || !onBoundsChange) return;
    
    const bounds = mapRef.current.getBounds();
    if (bounds) {
      onBoundsChange({
        sw: [bounds.getWest(), bounds.getSouth()],
        ne: [bounds.getEast(), bounds.getNorth()]
      });
    }
  }, [onBoundsChange]);

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
        onLoad={() => setIsLoaded(true)}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl 
          position="top-right" 
          trackUserLocation 
          showUserHeading
        />
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
}
