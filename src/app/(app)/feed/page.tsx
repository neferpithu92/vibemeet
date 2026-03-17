import { createClient } from '@/lib/supabase/server';
import FeedClient from '@/components/feed/FeedClient';

/**
 * Pagina Feed — Server Component per il fetching dei contenuti reali.
 */
export default async function FeedPage() {
  const supabase = await createClient();

  // Fetch dei post (media) con profili associati
  const { data: posts } = await supabase
    .from('media')
    .select(`
      *,
      profiles:users (*)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch delle storie (media_type = 'story' e create nelle ultime 24h)
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);

  const { data: stories } = await supabase
    .from('stories')
    .select(`
      *,
      profiles:users (*)
    `)
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false });

  return (
    <div className="page-container">
      <FeedClient 
        initialPosts={posts || []} 
        stories={stories || []} 
      />
    </div>
  );
}
