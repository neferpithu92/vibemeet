import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface HashtagLink {
  post_id: string;
  post_type: string;
  created_at: string;
}

interface HashtagContent {
  id: string;
  type: string;
  url: string;
  thumbnail_url?: string;
  caption?: string;
  like_count?: number;
  view_count?: number;
  created_at: string;
  author_id: string;
}

/**
 * GET /api/hashtags/[tag]
 * Returns hashtag details and paginated content tagged with it.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  const { tag } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '0');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const offset = page * limit;

  const supabase = await createClient();

  // Get hashtag info
  const { data: hashtag, error: hashError } = await supabase
    .from('hashtags')
    .select('*')
    .eq('tag', tag.toLowerCase())
    .single();

  if (hashError || !hashtag) {
    return NextResponse.json({ error: 'Hashtag non trovato' }, { status: 404 });
  }

  // Get content linked to this hashtag
  const { data: links, error: linksError } = await supabase
    .from('post_hashtags')
    .select('post_id, post_type, created_at')
    .eq('hashtag_id', hashtag.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  // Fetch media content for display
  const mediaIds = (links as HashtagLink[] || [])
    .filter((l) => l.post_type === 'media' || l.post_type === 'vibe')
    .map((l) => l.post_id);

  let media: HashtagContent[] = [];
  if (mediaIds.length > 0) {
    const { data } = await supabase
      .from('media')
      .select('id, type, url, thumbnail_url, caption, like_count, view_count, created_at, author_id')
      .in('id', mediaIds);
    media = data || [];
  }

  // Check if trending
  const { data: trendingData } = await supabase
    .from('trending_hashtags')
    .select('score')
    .eq('hashtag_id', hashtag.id)
    .eq('period', '24h')
    .order('score', { ascending: false })
    .limit(1);

  const isTrending = (trendingData && trendingData.length > 0);

  return NextResponse.json({
    hashtag: {
      ...hashtag,
      is_trending: isTrending,
    },
    content: media,
    pagination: {
      page,
      limit,
      total: hashtag.post_count,
    },
  });
}
