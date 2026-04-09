import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/feed/foryou
 * Algoritmo FYP: recupera i post ordinati per interazioni recenti.
 * Fallback robusto — non dipende da RPC opzionali nel DB.
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Login required' }, { status: 401 });
    }

    const limit = Number(searchParams.get('limit')) || 10;
    const offset = Number(searchParams.get('offset')) || 0;
    const cursor = searchParams.get('cursor');
    const type = searchParams.get('type'); // 'posts' or 'reels'
    
    // Map 'posts' to 'photo' and 'reels' to 'video' for the RPC
    const dbType = type === 'reels' ? 'video' : type === 'posts' ? 'photo' : null;

    // Use the RPC for intelligent ranking
    const { data: feed, error } = await supabase.rpc('get_fyp_algo_feed', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset,
      p_type: dbType
    });

    if (error) {
      console.warn('FYP algorithm RPC warning:', error.message);
      // Fallback or empty
      return NextResponse.json({ items: [], nextCursor: null });
    }

    // Map content for Frontend expectations
    const items = (feed || []).map((item: any) => ({
      ...item,
      profiles: {
        id: item.author_id,
        username: item.author_username,
        avatar_url: item.author_avatar,
        display_name: item.author_display_name
      }
    }));

    const nextCursor = items.length === limit
      ? (offset + limit).toString()
      : null;

    return NextResponse.json({ items, nextCursor });
  } catch (err: any) {
    console.error('FYP Error:', err);
    return NextResponse.json({ items: [], nextCursor: null });
  }
}
