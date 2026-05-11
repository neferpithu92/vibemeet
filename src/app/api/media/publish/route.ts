import { withApi, ok, Errors } from '@/lib/api';
import { mediaPublishSchema } from '@/lib/api/schemas';

/**
 * POST /api/media/publish
 * Inserisce un record media nel DB dopo il caricamento su Storage.
 * Supporta: photo, video, reel, story.
 * Rate: 20 pubblicazioni/min.
 */
export const POST = withApi(
  'media/publish',
  async (ctx, body) => {
    const { supabase, user } = ctx;
    const {
      url,
      type,
      caption,
      hashtags,
      filter,
      visibility,
      location_lat,
      location_lng,
      location_name,
    } = body;

    // Costruisci il payload
    const payload: Record<string, unknown> = {
      user_id:        user.id,
      entity_id:      user.id,
      entity_type:    'user',
      media_url:      url,
      media_type:     type,
      caption:        caption ?? null,
      visibility,
      filter_applied: filter ?? null,
    };

    if (location_lat !== undefined && location_lng !== undefined) {
      payload.location      = `POINT(${location_lng} ${location_lat})`;
      payload.location_name = location_name ?? null;
    }

    const { data: media, error: insertError } = await (supabase.from('media') as any)
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      throw Errors.internal(`Errore pubblicazione: ${insertError.message}`);
    }

    // ── Hashtags (fire-and-forget) ─────────────────────────
    if (hashtags && hashtags.length > 0 && media?.id) {
      const processHashtags = async () => {
        for (const rawTag of hashtags) {
          const tag = rawTag.replace(/^#/, '').toLowerCase().trim();
          if (!tag || tag.length > 100) continue;

          const { data: hashtagRec } = await (supabase.from('hashtags') as any)
            .upsert({ tag }, { onConflict: 'tag', ignoreDuplicates: false })
            .select('id')
            .single();

          if (hashtagRec?.id) {
            await (supabase.from('post_hashtags') as any)
              .upsert(
                { post_id: media.id, post_type: 'media', hashtag_id: hashtagRec.id },
                { onConflict: 'post_id,hashtag_id', ignoreDuplicates: true }
              );
          }
        }
      };
      processHashtags().catch((e) =>
        console.warn('[media/publish] hashtag processing error:', e.message)
      );
    }

    return ok({ media }, 201);
  },
  {
    auth:       true,
    bodySchema: mediaPublishSchema,
    rateLimit:  [20, '1m'],
  }
);
