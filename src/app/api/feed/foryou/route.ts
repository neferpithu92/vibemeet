import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/feed/foryou
 * Algoritmo FYP: 70% interessi, 20% trending città, 10% scoperta.
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Chiamata alla funzione SQL compute_feed_score (Migration 017)
    const { data: feed, error } = await supabase.rpc('get_fyp_algo_feed', {
      p_user_id: user?.id || null,
      p_limit: limit,
      p_cursor: cursor
    });

    if (error) throw error;

    return NextResponse.json({
      items: feed || [],
      nextCursor: feed && feed.length === limit ? feed[feed.length - 1].id : null
    });
  } catch (err: any) {
    console.error('FYP Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
