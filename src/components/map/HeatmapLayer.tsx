'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Source, Layer, useMap } from 'react-map-gl/mapbox';
import type { HeatmapLayer as HeatmapLayerType, CircleLayer } from 'mapbox-gl';

interface HeatmapData {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { weight: number };
  }>;
}

const EMPTY_GEOJSON: HeatmapData = { type: 'FeatureCollection', features: [] };

/**
 * HeatmapLayer — Renders a GL-accelerated heatmap on the Mapbox map.
 * Data is fetched from /api/map/heatmap based on current viewport bounds.
 * Auto-refreshes every 30 seconds when active.
 */
export default function HeatmapLayer({ visible = true }: { visible?: boolean }) {
  const { current: map } = useMap();
  const [data, setData] = useState<HeatmapData>(EMPTY_GEOJSON);
  const [isLoading, setIsLoading] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHeatmapData = useCallback(async () => {
    if (!map) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/map/heatmap?sw=${sw.lng},${sw.lat}&ne=${ne.lng},${ne.lat}`
      );
      if (res.ok) {
        const geojson = await res.json();
        setData(geojson);
      }
    } catch (err) {
      console.error('[Heatmap] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [map]);

  // Fetch on mount and when map moves
  useEffect(() => {
    if (!map || !visible) return;

    // Initial fetch
    fetchHeatmapData();

    // Refetch on moveend (debounced via Mapbox native events)
    const handler = () => fetchHeatmapData();
    map.on('moveend', handler);

    return () => {
      map.off('moveend', handler);
    };
  }, [map, visible, fetchHeatmapData]);

  // Auto-refresh every 30s when visible
  useEffect(() => {
    if (visible) {
      refreshTimer.current = setInterval(fetchHeatmapData, 30000);
    }
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [visible, fetchHeatmapData]);

  if (!visible) return null;

  // Mapbox GL Heatmap Layer Style
  const heatmapLayerStyle: HeatmapLayerType = {
    id: 'vibe-heatmap',
    type: 'heatmap',
    source: 'heatmap-data',
    maxzoom: 18,
    paint: {
      // Weight based on feature property
      'heatmap-weight': [
        'interpolate', ['linear'],
        ['get', 'weight'],
        0, 0,
        1, 1,
      ],
      // Intensity increases with zoom
      'heatmap-intensity': [
        'interpolate', ['linear'],
        ['zoom'],
        0, 0.2,
        13, 1,
        18, 3,
      ],
      // VIBE color gradient: transparent → cyan → purple → pink → hot white
      'heatmap-color': [
        'interpolate', ['linear'],
        ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.15, 'rgba(0, 200, 255, 0.15)',
        0.3, 'rgba(120, 80, 255, 0.35)',
        0.5, 'rgba(176, 38, 255, 0.55)',
        0.7, 'rgba(255, 45, 145, 0.7)',
        0.9, 'rgba(255, 100, 50, 0.85)',
        1.0, 'rgba(255, 255, 200, 1)',
      ],
      // Radius increases with zoom
      'heatmap-radius': [
        'interpolate', ['linear'],
        ['zoom'],
        0, 4,
        13, 25,
        16, 50,
        18, 80,
      ],
      // Fade out at high zoom to reveal individual points
      'heatmap-opacity': [
        'interpolate', ['linear'],
        ['zoom'],
        14, 0.85,
        17, 0.4,
        18, 0,
      ],
    },
  };

  // At high zoom, show individual glowing dots
  const pointLayerStyle: CircleLayer = {
    id: 'vibe-heatmap-points',
    type: 'circle',
    source: 'heatmap-data',
    minzoom: 15,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'],
        ['zoom'],
        15, 3,
        18, 8,
      ],
      'circle-color': [
        'interpolate', ['linear'],
        ['get', 'weight'],
        0, '#00C8FF',
        0.5, '#B026FF',
        1, '#FF2D91',
      ],
      'circle-opacity': [
        'interpolate', ['linear'],
        ['zoom'],
        15, 0,
        16, 0.6,
        18, 0.9,
      ],
      'circle-blur': 0.4,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.15)',
    },
  };

  return (
    <Source id="heatmap-data" type="geojson" data={data}>
      <Layer {...heatmapLayerStyle} />
      <Layer {...pointLayerStyle} />
    </Source>
  );
}
