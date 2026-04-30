import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route per recuperare dati geografici (venue ed eventi) basati sul viewport.
 * Fallback robusto: se le RPC PostGIS non sono disponibili, query dirette alle tabelle.
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
  const { data: mapData, error: mapError } = await (supabase as any).rpc('get_map_data', {
    sw_lon: sw[0],
    sw_lat: sw[1],
    ne_lon: ne[0],
    ne_lat: ne[1],
    last_24h_stories: true,
    p_genres: genres && genres.length > 0 ? genres : null
  });

  // Recupera Utenti Vicini separatamente
  const centerLon = (sw[0] + ne[0]) / 2;
  const centerLat = (sw[1] + ne[1]) / 2;
  const radius = Math.sqrt(Math.pow(ne[0] - sw[0], 2) + Math.pow(ne[1] - sw[1], 2)) * 50000;

  const { data: users } = await (supabase as any)
    .rpc('get_nearby_users', {
      lon: centerLon,
      lat: centerLat,
      radius_meters: Math.min(radius, 10000)
    });

  // Se la RPC non esiste o fallisce, fallback a query dirette sulle tabelle
  if (mapError) {
    console.warn('[Map] RPC get_map_data non disponibile, uso fallback diretto:', mapError.message);

    const [venuesResult, eventsResult, storiesResult] = await Promise.all([
      supabase
        .from('venues')
        .select('id, name, latitude, longitude, address, slug, description, vibe_score, crowd_density')
        .gte('latitude', sw[1])
        .lte('latitude', ne[1])
        .gte('longitude', sw[0])
        .lte('longitude', ne[0])
        .limit(50),
      supabase
        .from('events')
        .select('id, title, starts_at, ends_at, cover_url, venue:venues(id, name, latitude, longitude, address)')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(30),
      supabase
        .from('stories')
        .select('id, media_url, caption, location, author_id, profiles:users!author_id(username, avatar_url)')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .not('location', 'is', null)
        .limit(30),
    ]);

    return NextResponse.json(
      {
        venues: venuesResult.data || [],
        events: eventsResult.data || [],
        stories: storiesResult.data || [],
        media: [],
        users: users || [],
      },
      {
        headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=59' },
      }
    );
  }

  const safeData = (mapData as any) || {};

  return NextResponse.json(
    {
      venues: safeData.venues || [],
      events: safeData.events || [],
      stories: safeData.stories || [],
      media: safeData.media || [],
      users: users || [],
    },
    {
      headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=59' },
    }
  );
}
