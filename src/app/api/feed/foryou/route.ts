import { NextRequest } from 'next/server';
import { withApi, ok, Errors } from '@/lib/api';
import { feedQuerySchema } from '@/lib/api/schemas';

/**
 * GET /api/feed/foryou
 * Algoritmo FYP con RPC Supabase + fallback robusto.
 * Rate: 60 req/min.
 */
export const GET = withApi(
  'feed/foryou',
  async (ctx, _body, query) => {
    const { supabase, user } = ctx;
    const { limit, offset, type } = query as { limit: number; offset: number; type?: string };

    // Mappa i tipi UI ai media_type del DB
    const dbType =
      type === 'reels'  ? 'reel'  :
      type === 'posts'  ? 'photo' :
      type === 'stories'? 'story' :
      null;

    // ── 1. Tenta RPC intelligente ──────────────────────────
    const { data: feed, error: rpcError } = await (supabase as any).rpc('get_fyp_algo_feed', {
      p_user_id: user.id,
      p_limit:   limit,
      p_offset:  offset,
      p_type:    dbType,
    });

    if (!rpcError && feed) {
      const items = (feed as any[]).map(normalizeRpcItem);
      return ok({
        items,
        nextCursor: items.length === limit ? String(offset + limit) : null,
      });
    }

    // ── 2. Fallback: query diretta ─────────────────────────
    console.warn('[feed/foryou] RPC fallback:', rpcError?.message);

    let query2 = (supabase.from('media') as any)
      .select(`
        id,
        media_url,
        media_type,
        caption,
        created_at,
        like_count,
        comment_count,
        view_count,
        user_id,
        profiles:users!user_id (id, username, display_name, avatar_url, is_verified)
      `)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbType) query2 = query2.eq('media_type', dbType);

    const { data: fallbackFeed, error: fallbackError } = await query2;

    if (fallbackError) {
      console.error('[feed/foryou] Fallback error:', fallbackError.message);
      return ok({ items: [], nextCursor: null });
    }

    const items = (fallbackFeed ?? []).map(normalizeFallbackItem);

    return ok({
      items,
      nextCursor: items.length === limit ? String(offset + limit) : null,
    });
  },
  {
    auth:        true,
    querySchema: feedQuerySchema,
    rateLimit:   [60, '1m'],
  }
);

// ─────────────────────────────────────────────────────────────
// Normalizzatori
// ─────────────────────────────────────────────────────────────
function normalizeRpcItem(item: any) {
  return {
    id:                   item.id,
    url:                  item.media_url ?? item.url,
    type:                 item.media_type ?? item.type,
    caption:              item.caption,
    created_at:           item.created_at,
    like_count:           item.like_count ?? 0,
    comment_count:        item.comment_count ?? 0,
    view_count:           item.view_count ?? 0,
    author_username:      item.author_username,
    author_display_name:  item.author_display_name,
    author_avatar:        item.author_avatar,
    author_is_verified:   item.author_is_verified ?? false,
    profiles: {
      id:           item.user_id ?? item.author_id,
      username:     item.author_username,
      display_name: item.author_display_name,
      avatar_url:   item.author_avatar,
    },
  };
}

function normalizeFallbackItem(item: any) {
  const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
  return {
    id:                   item.id,
    url:                  item.media_url,
    type:                 item.media_type,
    caption:              item.caption,
    created_at:           item.created_at,
    like_count:           item.like_count ?? 0,
    comment_count:        item.comment_count ?? 0,
    view_count:           item.view_count ?? 0,
    author_username:      profile?.username,
    author_display_name:  profile?.display_name,
    author_avatar:        profile?.avatar_url,
    author_is_verified:   profile?.is_verified ?? false,
    profiles:             profile,
  };
}
