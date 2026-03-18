import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hashtags/trending
 * Returns trending hashtags, optionally filtered by city and search query.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || 'global';
  const period = searchParams.get('period') || '24h';
  const query = searchParams.get('q') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  const supabase = await createClient();

  // If there's a search query, search hashtags directly
  if (query) {
    const { data, error } = await supabase
      .from('hashtags')
      .select('tag, post_count')
      .ilike('tag', `%${query}%`)
      .order('post_count', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ hashtags: data || [] });
  }

  // Otherwise, return trending hashtags
  const { data, error } = await supabase
    .from('trending_hashtags')
    .select(`
      score,
      hashtag:hashtags (
        tag,
        post_count
      )
    `)
    .eq('city', city)
    .eq('period', period)
    .order('score', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten the response
  const hashtags = (data || []).map((item: any) => ({
    tag: item.hashtag?.tag,
    post_count: item.hashtag?.post_count || 0,
    score: item.score,
  })).filter((h: any) => h.tag);

  return NextResponse.json({ hashtags });
}
