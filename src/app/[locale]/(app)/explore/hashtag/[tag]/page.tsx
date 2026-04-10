import { createClient } from '@/lib/supabase/server';
import { HashtagBadge } from '@/components/ui/HashtagBadge';

interface HashtagMedia {
  id: string;
  media_type: string;
  media_url: string;
  thumbnail_url?: string;
  caption?: string;
  like_count?: number;
  view_count?: number;
  created_at: string;
}

/**
 * Explore Hashtag Page — Shows all content tagged with a specific hashtag.
 */
export default async function HashtagExplorePage({
  params,
}: {
  params: Promise<{ tag: string; locale: string }>;
}) {
  const { tag, locale } = await params;
  const decodedTag = decodeURIComponent(tag);
  const supabase = await createClient();

  // Fetch hashtag info
  const { data: hashtagData } = await (supabase
    .from('hashtags') as any)
    .select('*')
    .eq('tag', decodedTag.toLowerCase())
    .single();

  const hashtag = hashtagData as any;

  // Fetch linked media content
  let media: HashtagMedia[] = [];
  if (hashtag) {
    const { data: links } = await (supabase
      .from('post_hashtags') as any)
      .select('post_id, post_type')
      .eq('hashtag_id', hashtag.id)
      .order('created_at', { ascending: false })
      .limit(30);

    const mediaIds = (links || [])
      .filter((l: any) => l.post_type === 'media' || l.post_type === 'vibe')
      .map((l: any) => l.post_id);

    if (mediaIds.length > 0) {
      const { data } = await supabase
        .from('media')
        .select('id, media_type, media_url, thumbnail_url, caption, like_count, view_count, created_at')
        .in('id', mediaIds);
      media = (data as any) || [];
    }
  }

  // Check if trending
  let isTrending = false;
  if (hashtag) {
    const { data: trendingData } = await (supabase
      .from('trending_hashtags') as any)
      .select('score')
      .eq('hashtag_id', hashtag.id)
      .eq('period', '24h')
      .limit(1);
    isTrending = !!(trendingData && (trendingData as any[]).length > 0);
  }

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-vibe-gradient flex items-center justify-center text-2xl font-bold text-white">
              #
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-display font-bold text-vibe-text">
                  #{decodedTag}
                </h1>
                {isTrending && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border border-orange-500/20">
                    🔥 Trending
                  </span>
                )}
              </div>
              <p className="text-vibe-text-secondary text-sm mt-1">
                {hashtag
                  ? `${hashtag.post_count.toLocaleString()} post`
                  : 'Hashtag non trovato'}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          {hashtag && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-lg font-bold vibe-gradient-text">
                  {hashtag.post_count.toLocaleString()}
                </p>
                <p className="text-xs text-vibe-text-secondary">Post totali</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-lg font-bold vibe-gradient-text">
                  {media.filter((m) => m.media_type === 'video' || m.media_type === 'reel').length}
                </p>
                <p className="text-xs text-vibe-text-secondary">Vibes</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-lg font-bold vibe-gradient-text">
                  {media.filter((m) => m.media_type === 'photo').length}
                </p>
                <p className="text-xs text-vibe-text-secondary">Foto</p>
              </div>
            </div>
          )}
        </div>

        {/* Content Grid */}
        {media.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {media.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
              >
                {item.thumbnail_url || item.media_url ? (
                  <img
                    src={item.thumbnail_url || item.media_url}
                    alt={item.caption || ''}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-vibe-gradient-subtle flex items-center justify-center">
                    <span className="text-3xl">
                      {item.media_type === 'video' || item.media_type === 'reel' ? '🎬' : '📷'}
                    </span>
                  </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3">
                    <span className="flex items-center gap-1 text-white text-xs font-medium">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {item.like_count || 0}
                    </span>
                    <span className="flex items-center gap-1 text-white text-xs font-medium">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {item.view_count || 0}
                    </span>
                  </div>
                </div>
                {/* Type badge */}
                {(item.media_type === 'video' || item.media_type === 'reel') && (
                  <div className="absolute top-2 right-2">
                    <span className="text-white text-sm">▶️</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/5 rounded-2xl">
            <span className="text-4xl mb-4 block">🏷️</span>
            <p className="text-vibe-text-secondary">
              {hashtag
                ? 'Nessun contenuto ancora per questo hashtag.'
                : 'Questo hashtag non esiste ancora. Sii il primo ad usarlo!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
