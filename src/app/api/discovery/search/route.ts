import { withApi, ok, Errors } from '@/lib/api';
import { searchQuerySchema } from '@/lib/api/schemas';

/**
 * GET /api/discovery/search
 * Ricerca unificata: utenti, eventi, venue, artisti, hashtag.
 * Rate: 30 req/min (prevenzione scraping).
 */
export const GET = withApi(
  'discovery/search',
  async (ctx, _body, query) => {
    const { supabase } = ctx;
    const { q, limit, type } = query as { q: string; limit: number; type: string };

    const searchAll = type === 'all';
    const perType   = Math.ceil(limit / 4);

    // ── Ricerche in parallelo ──────────────────────────────
    const [usersRes, eventsRes, venuesRes, artistsRes, hashtagsRes] = await Promise.allSettled([
      // Utenti
      (searchAll || type === 'users')
        ? (supabase.from('users') as any)
            .select('id, username, display_name, avatar_url, bio, is_verified, followers_count')
            .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
            .limit(type === 'users' ? limit : perType)
        : Promise.resolve({ data: null }),

      // Eventi
      (searchAll || type === 'events')
        ? (supabase.from('events') as any)
            .select('id, title, description, category, starts_at, cover_url, venue:venues(name)')
            .or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
            .gte('starts_at', new Date().toISOString()) // solo eventi futuri
            .limit(type === 'events' ? limit : perType)
        : Promise.resolve({ data: null }),

      // Venue
      (searchAll || type === 'venues')
        ? (supabase.from('venues') as any)
            .select('id, name, description, type, slug, city, avatar_url')
            .or(`name.ilike.%${q}%,description.ilike.%${q}%,city.ilike.%${q}%`)
            .limit(type === 'venues' ? limit : perType)
        : Promise.resolve({ data: null }),

      // Artisti
      (searchAll || type === 'artists')
        ? (supabase.from('artists') as any)
            .select('id, name, bio, avatar_url, genres, followers_count')
            .or(`name.ilike.%${q}%,bio.ilike.%${q}%`)
            .limit(type === 'artists' ? limit : perType)
        : Promise.resolve({ data: null }),

      // Hashtag
      (searchAll)
        ? (supabase.from('hashtags') as any)
            .select('id, tag, post_count')
            .ilike('tag', `%${q}%`)
            .order('post_count', { ascending: false })
            .limit(5)
        : Promise.resolve({ data: null }),
    ]);

    const users    = (usersRes.status    === 'fulfilled' ? usersRes.value.data    : null) ?? [];
    const events   = (eventsRes.status   === 'fulfilled' ? eventsRes.value.data   : null) ?? [];
    const venues   = (venuesRes.status   === 'fulfilled' ? venuesRes.value.data   : null) ?? [];
    const artists  = (artistsRes.status  === 'fulfilled' ? artistsRes.value.data  : null) ?? [];
    const hashtags = (hashtagsRes.status === 'fulfilled' ? hashtagsRes.value.data : null) ?? [];

    return ok({
      users:    users.map((u: any)    => ({ ...u, type: 'user',    displayName: u.display_name || u.username })),
      events:   events.map((e: any)   => ({ ...e, type: 'event',   displayName: e.title })),
      venues:   venues.map((v: any)   => ({ ...v, type: 'venue',   displayName: v.name })),
      artists:  artists.map((a: any)  => ({ ...a, type: 'artist',  displayName: a.name })),
      hashtags: hashtags.map((h: any) => ({ ...h, type: 'hashtag', displayName: `#${h.tag}` })),
      query: q,
      total: users.length + events.length + venues.length + artists.length,
    });
  },
  {
    auth:        true,
    querySchema: searchQuerySchema,
    rateLimit:   [30, '1m'],
  }
);
