import { withApi, ok, Errors } from '@/lib/api';

export const GET = withApi(
  'profile/public',
  async (ctx, _body, _query, req) => {
    // Leggiamo dall'URL
    const url = new URL(req.url);
    const username = url.pathname.split('/').pop();

    if (!username) {
      throw Errors.badRequest('Username mancante');
    }

    // 1. Fetch profilo utente
    const { data: profile, error: profileErr } = await ctx.supabase
      .from('users')
      .select('id, username, display_name, avatar_url, bio, is_verified, account_type')
      .eq('username', username)
      .single();

    if (profileErr || !profile) {
      throw Errors.notFound('Utente non trovato');
    }

    const isOwnProfile = ctx.user?.id === profile.id;
    const isPrivate = profile.account_type === 'private';

    // 2. Fetch counts e stato del following
    const [
      { count: followersCount },
      { count: followingCount },
      { count: postCount },
      { data: followData }
    ] = await Promise.all([
      // Follower count
      ctx.supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profile.id)
        .eq('entity_type', 'user'),

      // Following count
      ctx.supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profile.id)
        .eq('entity_type', 'user'),

      // Post count
      ctx.supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', profile.id),

      // Verifica se l'utente loggato segue questo profilo
      ctx.user
        ? ctx.supabase
            .from('followers')
            .select('follower_id')
            .match({ follower_id: ctx.user.id, following_id: profile.id, entity_type: 'user' })
            .maybeSingle()
        : Promise.resolve({ data: null })
    ]);

    const isFollowing = !!followData;
    const canViewContent = !isPrivate || isOwnProfile || isFollowing;

    let media: any[] = [];
    if (canViewContent) {
      const { data: mediaData } = await ctx.supabase
        .from('media')
        .select('id, url, thumbnail_url, type, like_count, created_at, is_featured, metadata')
        .eq('author_id', profile.id)
        .order('created_at', { ascending: false });
        
      if (mediaData) media = mediaData;
    }

    return ok({
      profile: {
        ...profile,
        follower_count: followersCount || 0,
        following_count: followingCount || 0,
        post_count: postCount || 0
      },
      is_following: isFollowing,
      can_view_content: canViewContent,
      media
    });
  },
  {
    auth: true, // richiede login, ma gestiamo la logica public nei permessi
    rateLimit: [60, '1m'] 
  }
);
