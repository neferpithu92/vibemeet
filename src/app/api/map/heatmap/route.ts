import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * API Route per i dati della Heatmap — restituisce posizioni anonimizzate
 * degli utenti attivi nelle ultime 4 ore come GeoJSON FeatureCollection.
 * I punti vengono arrotondati a ~100m per privacy.
 */
export const revalidate = 60; // Edge Cache for 60 seconds (Scalability)

const boundsSchema = z.object({
  sw: z.array(z.number().min(-180).max(180)).length(2),
  ne: z.array(z.number().min(-180).max(180)).length(2),
});

export async function GET(request: Request) {
  const supabase = await createClient();

  // Sicurezza 1: Controllo Autenticazione (Previene scraping anonimo)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  
  try {
    const swParams = searchParams.get('sw')?.split(',').map(Number);
    const neParams = searchParams.get('ne')?.split(',').map(Number);

    // Sicurezza 2: Validazione Input Rigorosa (Previene injection/crash)
    const { sw, ne } = boundsSchema.parse({ sw: swParams, ne: neParams });

    // Try the RPC first (uses PostGIS for efficient spatial query)
    const { data: heatmapData, error: rpcError } = await (supabase as any).rpc('get_heatmap_points', {
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
  } catch (error) {
    return NextResponse.json({ error: 'Invalid Coordinates Format' }, { status: 400 });
  }
}
