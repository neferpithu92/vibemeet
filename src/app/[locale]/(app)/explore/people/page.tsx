import { createClient } from '@/lib/supabase/server';
import DiscoverPeopleClient from './DiscoverPeopleClient';

export default async function DiscoverPeoplePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get following list
  const { data: following } = await supabase
    .from('follows').select('following_id').eq('follower_id', user.id);
  const followingIds = following?.map(f => f.following_id) || [];

  // People you might know — friends of friends
  let suggestions: any[] = [];
  try {
    const { data } = await supabase.rpc('get_follow_suggestions', {
      current_user_id: user.id,
      limit_count: 20
    });
    suggestions = data || [];
  } catch {
    suggestions = [];
  }

  // Active tonight — recent check-ins
  const { data: activeTonight } = await supabase
    .from('check_ins')
    .select(`
      user_id,
      venue_id,
      created_at,
      users:user_id (id, username, display_name, avatar_url),
      venues:venue_id (name)
    `)
    .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
    .neq('user_id', user.id)
    .limit(10);

  return (
    <DiscoverPeopleClient
      suggestions={suggestions || []}
      activeTonight={(activeTonight || []) as any[]}
      currentUserId={user.id}
      followingIds={followingIds}
    />
  );
}
