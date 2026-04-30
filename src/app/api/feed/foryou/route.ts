import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/feed/foryou
 * Algoritmo FYP: recupera i post ordinati per interazioni recenti.
 * Fallback robusto — query diretta se la RPC non è disponibile.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Login required' }, { status: 401 });
    }

    const limit = Math.min(Number(searchParams.get('limit')) || 10, 50);
    const offset = Number(searchParams.get('offset')) || 0;
    const type = searchParams.get('type'); // 'posts' or 'reels'
    
    // Map 'posts' to 'photo' and 'reels' to 'video' for the RPC
    const dbType = type === 'reels' ? 'video' : type === 'posts' ? 'photo' : null;

    // Try the RPC for intelligent ranking first
    const { data: feed, error } = await (supabase as any).rpc('get_fyp_algo_feed', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset,
      p_type: dbType
    });

    if (error) {
      console.warn('[FYP] RPC unavailable, falling back to direct query:', error.message);

      // Fallback: direct query with basic ranking
      let query = supabase
        .from('media')
        .select(`
          id,
          url,
          type,
          caption,
          created_at,
          like_count,
          view_count,
          author_id,
          profiles:users!media_author_id_fkey(id, username, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (dbType) {
        query = query.eq('type', dbType);
      }

      const { data: fallbackFeed, error: fallbackError } = await query;

      if (fallbackError) {
        console.error('[FYP] Fallback query error:', fallbackError.message);
        return NextResponse.json({ items: [], nextCursor: null });
      }

      const items = (fallbackFeed || []).map((item: any) => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
      }));

      const nextCursor = items.length === limit ? (offset + limit).toString() : null;
      return NextResponse.json({ items, nextCursor });
    }

    // Map RPC result for frontend expectations
    const items = (feed || []).map((item: any) => ({
      ...item,
      profiles: {
        id: item.author_id,
        username: item.author_username,
        avatar_url: item.author_avatar,
        display_name: item.author_display_name
      }
    }));

    const nextCursor = items.length === limit ? (offset + limit).toString() : null;

    return NextResponse.json({ items, nextCursor });
  } catch (err: any) {
    console.error('[FYP] Fatal error:', err);
    return NextResponse.json({ items: [], nextCursor: null });
  }
}
