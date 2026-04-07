import { createClient } from '@/lib/supabase/server';
import LeaderboardClient from './LeaderboardClient';

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: leaders } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, vibe_points')
    .order('vibe_points', { ascending: false })
    .limit(50);

  const { data: challenges } = await supabase
    .from('weekly_challenges')
    .select('*')
    .lte('starts_at', new Date().toISOString())
    .gte('ends_at', new Date().toISOString())
    .limit(5);

  let userRank: number | null = null;
  let userParticipations: any[] = [];

  if (user) {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('vibe_points', (leaders?.find(l => l.id === user.id)?.vibe_points || 0));
    userRank = (count || 0) + 1;

    if (challenges?.length) {
      const { data: participations } = await supabase
        .from('challenge_participations')
        .select('*')
        .eq('user_id', user.id)
        .in('challenge_id', challenges.map(c => c.id));
      userParticipations = participations || [];
    }
  }

  return (
    <LeaderboardClient
      leaders={(leaders || []) as any[]}
      challenges={(challenges || []) as any[]}
      currentUserId={user?.id}
      userRank={userRank}
      userParticipations={userParticipations}
    />
  );
}
