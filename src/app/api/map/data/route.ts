import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route per recuperare dati geografici (venue ed eventi) basati sul viewport.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sw = searchParams.get('sw')?.split(',').map(Number);
  const ne = searchParams.get('ne')?.split(',').map(Number);
  const genres = searchParams.get('genres')?.split(',').filter(Boolean);

  if (!sw || !ne || sw.length !== 2 || ne.length !== 2) {
    return NextResponse.json({ error: 'Bounds richiesti' }, { status: 400 });
  }

  const supabase = await createClient();

  // Recupera dati mappa consolidati via PostGIS RPC (Venues, Events, Stories)
  const { data: mapData, error: mapError } = await supabase.rpc('get_map_data', {
    sw_lon: sw[0],
    sw_lat: sw[1],
    ne_lon: ne[0],
    ne_lat: ne[1],
    last_24h_stories: true,
    p_genres: genres && genres.length > 0 ? genres : null
  });

  // Recupera Utenti Vicini (Nearby People) separatamente
  const centerLon = (sw[0] + ne[0]) / 2;
  const centerLat = (sw[1] + ne[1]) / 2;
  const radius = Math.sqrt(Math.pow(ne[0] - sw[0], 2) + Math.pow(ne[1] - sw[1], 2)) * 50000;

  const { data: users, error: usersError } = await supabase
    .rpc('get_nearby_users', {
      lon: centerLon,
      lat: centerLat,
      radius_meters: Math.min(radius, 10000)
    });

  if (mapError || usersError) {
    console.error('Map Data API Error:', { mapError, usersError });
    return NextResponse.json({ 
      error: 'Errore fetching dati',
      details: mapError || usersError
    }, { status: 500 });
  }

  const { venues, events, stories, media } = mapData as any;

  return NextResponse.json(
    { venues, events, stories, media, users },
    {
      headers: {
        'Cache-Control': 's-maxage=10, stale-while-revalidate=59',
      },
    }
  );
}
