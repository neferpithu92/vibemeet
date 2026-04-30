import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hashtags/trending
 * Returns trending hashtags from the hashtags table (ordered by count).
 * Falls back gracefully if the trending_hashtags view is not available.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  const supabase = await createClient();

  // Search query or trending list — both use the hashtags table directly
  let dbQuery = supabase
    .from('hashtags')
    .select('id, tag, count, last_used_at')
    .order('count', { ascending: false })
    .limit(limit);

  if (query) {
    dbQuery = dbQuery.ilike('tag', `%${query}%`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error('[Hashtags Trending] DB error:', error.message);
    return NextResponse.json({ hashtags: [] }, { status: 200 });
  }

  const hashtags = (data || []).map((h: any) => ({
    tag: h.tag,
    count: h.count || 0,
    last_used_at: h.last_used_at,
  }));

  return NextResponse.json({ hashtags });
}
