import { createClient } from '@/lib/supabase/server';
import ArtistClient from './ArtistClient';
import { notFound } from 'next/navigation';

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: artistData, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', id)
    .single();

  const artist = artistData as any;

  if (error || !artist) return notFound();

  // Upcoming events for this artist
  const { data: events } = await supabase
    .from('event_artists')
    .select('events(*)')
    .eq('artist_id', id)
    .gte('events.starts_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(10);

  // Check if user follows this artist
  let isFollowing = false;
  if (user) {
    const { data: follow } = await (supabase.from('followers') as any)
      .select('following_id')
      .eq('follower_id', user.id)
      .eq('following_id', artist.id)
      .eq('entity_type', 'artist')
      .single();
    isFollowing = !!follow;
  }

  return (
    <ArtistClient
      artist={artist}
      events={events?.map(e => (e as any).events).filter(Boolean) || []}
      isFollowing={isFollowing}
      currentUserId={user?.id}
    />
  );
}
