import { createClient } from '@/lib/supabase/server';
import FeedClient from '@/components/feed/FeedClient';

/**
 * Pagina Feed — Server Component per il fetching dei contenuti reali.
 */
export default async function FeedPage() {
  const supabase = await createClient();

  // Fetch dei post (media) con profili associati
  const { data: posts, error: postsError } = await supabase
    .from('media')
    .select(`
      id,
      url,
      type,
      caption,
      created_at,
      like_count,
      view_count,
      profiles:users!media_author_id_fkey (id, username, display_name, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (postsError) {
    console.error('[Feed] Error loading posts:', postsError.message);
  }

  // Fetch delle storie (create nelle ultime 24h, non scadute)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: stories, error: storiesError } = await supabase
    .from('stories')
    .select(`
      id,
      media_url,
      type,
      profiles:users!author_id (id, username, display_name, avatar_url)
    `)
    .gte('created_at', yesterday)
    .lte('expires_at', new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (storiesError) {
    console.error('[Feed] Error loading stories:', storiesError.message);
  }

  return (
    <div className="page-container">
      <FeedClient 
        initialPosts={(posts || []) as any[]} 
        stories={(stories || []) as any[]} 
      />
    </div>
  );
}
