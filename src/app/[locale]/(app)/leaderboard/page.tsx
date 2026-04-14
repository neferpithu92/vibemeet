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

  const { data: challenges } = await (supabase as any)
    .from('challenges')
    .select('id, title, description, reward_points, end_date, is_active')
    .eq('is_active', true)
    .lte('start_date', new Date().toISOString())
    .gte('end_date', new Date().toISOString())
    .limit(5);

  let userRank: number | null = null;
  let userParticipations: any[] = [];

  if (user) {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('vibe_points', ((leaders as any[])?.find((l: any) => l.id === user.id)?.vibe_points || 0));
    userRank = (count || 0) + 1;

    if (challenges?.length) {
      const { data: participations } = await (supabase as any)
        .from('challenge_participants')
        .select('challenge_id, points_awarded, joined_at')
        .eq('user_id', user.id)
        .in('challenge_id', challenges.map((c: any) => c.id));
      userParticipations = (participations || []).map((p: any) => ({
        challenge_id: p.challenge_id,
        progress: p.points_awarded || 0,
        completed: p.points_awarded > 0
      }));
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
