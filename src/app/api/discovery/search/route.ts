import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  if (!query || query.length < 2) {
    return NextResponse.json({ 
      users: [],
      events: [],
      venues: [],
      artists: [],
      hashtags: [] 
    });
  }

  const supabase = await createClient();

  // Search users
  const { data: users } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, is_verified, bio')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .eq('is_active', true)
    .limit(8);

  // Search events
  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, category, starts_at, venue:venues(name)')
    .ilike('title', `%${query}%`)
    .limit(5);

  // Search venues
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, description, type, slug, city')
    .ilike('name', `%${query}%`)
    .limit(5);

  // Search artists
  const { data: artists } = await supabase
    .from('artists')
    .select('id, name, bio, avatar_url, genres')
    .ilike('name', `%${query}%`)
    .limit(5);

  // Search hashtags
  const { data: hashtags } = await supabase
    .from('hashtags')
    .select('id, tag, post_count')
    .ilike('tag', `%${query}%`)
    .order('post_count', { ascending: false })
    .limit(5);

  return NextResponse.json({
    users: users || [],
    events: events || [],
    venues: venues || [],
    artists: artists || [],
    hashtags: hashtags || []
  });
}
