import { createClient } from '@/lib/supabase/server';
import LiveClient from './LiveClient';

export default async function LivePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch active live streams
  const { data: streams } = await supabase
    .from('live_streams')
    .select(`
      *,
      host:users!host_id (id, username, display_name, avatar_url),
      event:events (id, title, cover_url)
    `)
    .eq('status', 'live')
    .order('viewer_count', { ascending: false })
    .limit(20);

  // Fetch scheduled streams
  const { data: scheduled } = await supabase
    .from('live_streams')
    .select(`
      *,
      host:users!host_id (id, username, display_name, avatar_url)
    `)
    .eq('status', 'scheduled')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true })
    .limit(10);

  return (
    <LiveClient
      streams={(streams || []) as any[]}
      scheduled={(scheduled || []) as any[]}
      currentUserId={user?.id}
    />
  );
}
