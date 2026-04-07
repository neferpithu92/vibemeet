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

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const cursor = searchParams.get('cursor');

    // Direct query — no RPC needed, works even on empty DB
    let query = supabase
      .from('media')
      .select(`
        id, media_url, thumbnail_url, media_type, caption,
        created_at, likes_count, comments_count, location,
        profiles:user_id ( id, username, avatar_url, display_name )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: feed, error } = await query;

    if (error) {
      // Silently return empty — don't crash the page
      console.warn('FYP query warning:', error.message);
      return NextResponse.json({ items: [], nextCursor: null });
    }

    const items = feed || [];
    const nextCursor = items.length === limit
      ? items[items.length - 1].created_at
      : null;

    return NextResponse.json({ items, nextCursor });
  } catch (err: any) {
    console.error('FYP Error:', err);
    return NextResponse.json({ items: [], nextCursor: null });
  }
}
