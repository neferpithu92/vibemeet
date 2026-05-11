import { withApi, ok, Errors } from '@/lib/api';

export const GET = withApi(
  'profile/me',
  async (ctx) => {
    const userId = ctx.user.id;

    // Eseguiamo query in parallelo per le performance
    const [
      { data: profile, error: profileErr },
      { data: media },
      { data: checkIns },
      { data: tickets },
      { count: followersCount },
      { count: followingCount }
    ] = await Promise.all([
      // Profilo
      ctx.supabase
        .from('users')
        .select('id, display_name, username, bio, avatar_url, is_verified, map_visibility, account_type')
        .eq('id', userId)
        .single(),

      // Media (Post, Reels, Storie, Highlights)
      ctx.supabase
        .from('media')
        .select('*, venue:venues(name)')
        .eq('author_id', userId)
        .order('created_at', { ascending: false }),

      // Check-ins
      ctx.supabase
        .from('check_ins')
        .select('*, venue:venues(name, address, slug), event:events(title, id)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      // Biglietti
      ctx.supabase
        .from('tickets')
        .select('*, event:events(id, title, starts_at, venue:venues(name, city))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      // Follower count
      ctx.supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)
        .eq('entity_type', 'user'),

      // Following count
      ctx.supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId)
        .eq('entity_type', 'user')
    ]);

    if (profileErr || !profile) {
      throw Errors.notFound('Profilo non trovato');
    }

    return ok({
      profile: {
        ...profile,
        follower_count: followersCount || 0,
        following_count: followingCount || 0,
        post_count: media?.filter(m => m.type === 'photo' || m.type === 'video' || m.type === 'reel').length || 0
      },
      media: media || [],
      check_ins: checkIns || [],
      tickets: tickets || []
    });
  },
  {
    auth: true,
    rateLimit: [30, '1m'] // Limite alto per fetch pagina personale
  }
);
