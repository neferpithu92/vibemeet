import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route per recuperare dati geografici (venue ed eventi) basati sul viewport.
 * Fallback robusto: se le RPC PostGIS non sono disponibili, query dirette alle tabelle.
 * 
 * NOTA SCHEMA: la tabella venues usa `location: Json` (GeoJSON Point) invece di
 * colonne separate latitude/longitude. I campi lat/lng vengono estratti dal JSON.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sw = searchParams.get('sw')?.split(',').map(Number);
  const ne = searchParams.get('ne')?.split(',').map(Number);
  const genres = searchParams.get('genres')?.split(',').filter(Boolean);

  if (!sw || !ne || sw.length !== 2 || ne.length !== 2) {
    return NextResponse.json({ error: 'Bounds richiesti' }, { status: 400 });
  }

  // Validate bounds are real numbers
  if (sw.some(isNaN) || ne.some(isNaN)) {
    return NextResponse.json({ error: 'Bounds non validi' }, { status: 400 });
  }

  const supabase = await createClient();

  // Tentativo 1: RPC PostGIS ottimizzata (include filtraggio geografico nativo)
  const [mapResult, usersResult] = await Promise.allSettled([
    (supabase as any).rpc('get_map_data', {
      sw_lon: sw[0],
      sw_lat: sw[1],
      ne_lon: ne[0],
      ne_lat: ne[1],
      last_24h_stories: true,
      p_genres: genres && genres.length > 0 ? genres : null
    }),
    (supabase as any).rpc('get_nearby_users', {
      lon: (sw[0] + ne[0]) / 2,
      lat: (sw[1] + ne[1]) / 2,
      radius_meters: Math.min(
        Math.sqrt(Math.pow(ne[0] - sw[0], 2) + Math.pow(ne[1] - sw[1], 2)) * 50000,
        10000
      )
    })
  ]);

  const users = usersResult.status === 'fulfilled' ? (usersResult.value.data || []) : [];

  // Tentativo 1 riuscito → usa dati RPC
  if (mapResult.status === 'fulfilled' && !mapResult.value.error) {
    const safeData = (mapResult.value.data as any) || {};
    return NextResponse.json(
      {
        venues: safeData.venues || [],
        events: safeData.events || [],
        stories: safeData.stories || [],
        media: safeData.media || [],
        users,
      },
      { headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=59' } }
    );
  }

  // Tentativo 2: Fallback con query dirette
  // NOTA: venues.location è un GeoJSON Point {type:"Point", coordinates:[lon,lat]}
  // Non possiamo filtrare geograficamente senza PostGIS, quindi carichiamo le più recenti
  console.warn('[Map] RPC get_map_data unavailable, using direct table fallback');

  const [venuesResult, eventsResult, storiesResult] = await Promise.all([
    supabase
      .from('venues')
      .select('id, name, location, address, city, slug, description, vibe_score, type, is_verified')
      .limit(50),
    supabase
      .from('events')
      .select('id, title, starts_at, ends_at, cover_url, category, venue_id, venue:venues(id, name, location, address, city)')
      .gte('starts_at', new Date().toISOString())
      .eq('status', 'published')
      .order('starts_at', { ascending: true })
      .limit(30),
    supabase
      .from('stories')
      .select('id, media_url, caption, location, author_id, profiles:users!stories_author_id_fkey(username, avatar_url)')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .not('location', 'is', null)
      .limit(30),
  ]);

  // Normalize venues: extract lat/lon from GeoJSON location for map markers
  const venues = (venuesResult.data || []).map((v: any) => {
    const loc = v.location as any;
    const coords = loc?.coordinates || loc?.coords;
    return {
      ...v,
      longitude: Array.isArray(coords) ? coords[0] : null,
      latitude: Array.isArray(coords) ? coords[1] : null,
    };
  }).filter((v: any) => v.latitude !== null && v.longitude !== null);

  // Normalize events: pull lat/lon from nested venue.location
  const events = (eventsResult.data || []).map((e: any) => {
    const venueLoc = (Array.isArray(e.venue) ? e.venue[0] : e.venue)?.location as any;
    const coords = venueLoc?.coordinates || venueLoc?.coords;
    return {
      ...e,
      venue: Array.isArray(e.venue) ? e.venue[0] : e.venue,
      longitude: Array.isArray(coords) ? coords[0] : null,
      latitude: Array.isArray(coords) ? coords[1] : null,
    };
  });

  return NextResponse.json(
    {
      venues,
      events,
      stories: storiesResult.data || [],
      media: [],
      users,
    },
    { headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=59' } }
  );
}
