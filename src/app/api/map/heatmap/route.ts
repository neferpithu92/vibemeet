import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route per i dati della Heatmap — restituisce posizioni anonimizzate
 * degli utenti attivi nelle ultime 4 ore come GeoJSON FeatureCollection.
 * I punti vengono arrotondati a ~100m per privacy.
 */
export const revalidate = 60; // Edge Cache for 60 seconds (Scalability)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sw = searchParams.get('sw')?.split(',').map(Number);
  const ne = searchParams.get('ne')?.split(',').map(Number);

  if (!sw || !ne || sw.length !== 2 || ne.length !== 2) {
    return NextResponse.json({ error: 'Bounds richiesti (sw=lon,lat&ne=lon,lat)' }, { status: 400 });
  }

  const supabase = await createClient();

  // Try the RPC first (uses PostGIS for efficient spatial query)
  const { data: heatmapData, error: rpcError } = await supabase.rpc('get_heatmap_points', {
    sw_lon: sw[0],
    sw_lat: sw[1],
    ne_lon: ne[0],
    ne_lat: ne[1],
    hours_back: 4,
  });

  if (rpcError || !heatmapData) {
    console.error('Heatmap RPC Failed', rpcError);
    return NextResponse.json({
      type: 'FeatureCollection',
      features: [],
    });
  }

  // Convert to GeoJSON FeatureCollection
  const features = (heatmapData as any[]).map((pt: any) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [pt.longitude, pt.latitude],
    },
    properties: {
      weight: pt.weight || 1,
    },
  }));

  return NextResponse.json({
    type: 'FeatureCollection',
    features,
  });
}
