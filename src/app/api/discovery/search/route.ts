import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route per la ricerca globale di eventi, locali e artisti.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized - Login required' }, { status: 401 });
  }

  // Ricerca eventi
  const { data: events } = await supabase
    .from('events')
    .select(`
      id,
      title,
      description,
      category,
      latitude,
      longitude,
      venue:venues(name, latitude, longitude)
    `)
    .ilike('title', `%${query}%`)
    .limit(5);

  // Ricerca locali
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, description, type, slug, latitude, longitude')
    .ilike('name', `%${query}%`)
    .limit(5);

  // Ricerca artisti
  const { data: artists } = await supabase
    .from('artists')
    .select('id, name, bio, avatar_url')
    .ilike('name', `%${query}%`)
    .limit(5);

  // Ricerca profili utenti (Amici)
  const { data: users_profiles } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, last_location')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(5);

  // Converti i profili in un formato compatibile con il frontend
  const users = (users_profiles || []).map(u => ({
    id: u.id,
    displayName: u.display_name || u.username,
    type: 'user',
    longitude: (u.last_location as any)?.coordinates?.[0],
    latitude: (u.last_location as any)?.coordinates?.[1]
  }));

  return NextResponse.json({
    events: events || [],
    venues: venues || [],
    artists: artists || [],
    users: users
  });
}
