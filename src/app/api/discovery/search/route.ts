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

  // Ricerca eventi
  const { data: events } = await supabase
    .from('events')
    .select(`
      id,
      title,
      description,
      category,
      venue:venues(name)
    `)
    .ilike('title', `%${query}%`)
    .limit(5);

  // Ricerca locali
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, description, type, slug')
    .ilike('name', `%${query}%`)
    .limit(5);

  // Ricerca artisti
  const { data: artists } = await supabase
    .from('artists')
    .select('id, name, bio, avatar_url')
    .ilike('name', `%${query}%`)
    .limit(5);

  return NextResponse.json({
    events: events || [],
    venues: venues || [],
    artists: artists || []
  });
}
