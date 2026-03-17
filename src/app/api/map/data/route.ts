import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route per recuperare dati geografici (venue ed eventi) basati sul viewport.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sw = searchParams.get('sw')?.split(',').map(Number);
  const ne = searchParams.get('ne')?.split(',').map(Number);

  if (!sw || !ne || sw.length !== 2 || ne.length !== 2) {
    return NextResponse.json({ error: 'Bounds richiesti' }, { status: 400 });
  }

  const supabase = await createClient();

  // Recupera venue
  const { data: venues, error: venuesError } = await supabase
    .from('venues')
    .select('*')
    .gte('longitude', sw[0])
    .lte('longitude', ne[0])
    .gte('latitude', sw[1])
    .lte('latitude', ne[1]);

  // Recupera eventi
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select(`
      *,
      venue:venues!inner(*)
    `)
    .gte('venues.longitude', sw[0])
    .lte('venues.longitude', ne[0])
    .gte('venues.latitude', sw[1])
    .lte('venues.latitude', ne[1])
    .gte('end_time', new Date().toISOString());

  // Recupera storie (create nelle ultime 24h)
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);

  const { data: stories, error: storiesError } = await supabase
    .from('stories')
    .select(`
      *,
      profiles:users (*)
    `)
    .gte('created_at', yesterday.toISOString())
    .not('location', 'is', null);

  // Recupera Utenti Vicini (Nearby People)
  const centerLon = (sw[0] + ne[0]) / 2;
  const centerLat = (sw[1] + ne[1]) / 2;
  // Calcola un raggio approssimativo basato sulla larghezza dei bounds
  const radius = Math.sqrt(Math.pow(ne[0] - sw[0], 2) + Math.pow(ne[1] - sw[1], 2)) * 50000;

  const { data: users, error: usersError } = await supabase
    .rpc('get_nearby_users', {
      lon: centerLon,
      lat: centerLat,
      radius_meters: Math.min(radius, 10000) // max 10km
    });

  if (venuesError || eventsError || storiesError || usersError) {
    return NextResponse.json({ 
      error: 'Errore fetching dati',
      details: venuesError || eventsError || storiesError || usersError
    }, { status: 500 });
  }

  return NextResponse.json({ venues, events, stories, users });
}
