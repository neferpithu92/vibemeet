'use client';

import { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
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
 * Highly Optimized Map Component (System 7 & 13)
 * Pure display container. All data fetching is handled by the parent page.
 */
export const MapView = forwardRef<MapRef, MapViewProps>(({ 
  initialViewState = {
    longitude: 8.5417, // Zurich
    latitude: 47.3769,
    zoom: 13
  },
  children,
  onBoundsChange
}, ref) => {
  const mapRef = useRef<MapRef>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Expose the internal mapRef to parent
  useImperativeHandle(ref, () => mapRef.current as MapRef);

  const handleMapLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleMoveEnd = useCallback(() => {
    if (!mapRef.current) return;
    
    const bounds = mapRef.current.getBounds();
    if (onBoundsChange && bounds) {
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
        <h3 className="text-xl font-bold mb-2 text-white">Map Configuration Needed</h3>
        <p className="text-vibe-text-secondary max-w-sm mb-6 text-sm">
          Please add your **Mapbox Public Token** to `.env.local` to enable the interactive map.
        </p>
        <code className="bg-white/5 px-4 py-2 rounded-lg text-xs font-mono border border-white/10 mb-6 text-vibe-purple">
          NEXT_PUBLIC_MAPBOX_TOKEN=pk....
        </code>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-vibe-dark">
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
          
          {/* Managed Markers from Parent */}
          {isLoaded && children}
        </Map>
      </MapProvider>

      {/* Loading Glow */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-vibe-dark flex items-center justify-center z-10">
          <div className="relative w-12 h-12">
             <div className="absolute inset-0 border-2 border-vibe-purple/20 rounded-full"></div>
             <div className="absolute inset-0 border-t-2 border-vibe-purple rounded-full animate-spin"></div>
          </div>
        </div>
      )}
    </div>
  );
});

MapView.displayName = 'MapView';
