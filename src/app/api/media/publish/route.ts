import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/media/publish
 * Inserisce un record nel DB media dopo che il file è stato caricato su Storage.
 * Supporta foto, video, reel, story.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      url,
      type,            // 'photo' | 'video' | 'reel' | 'story'
      caption,
      hashtags,
      filter,
      visibility = 'public',
      location_lat,
      location_lng,
      location_name,
    } = body;

    if (!url || !type) {
      return NextResponse.json({ error: 'url e type sono obbligatori' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Mappa reel/story su video per compatibilità col campo media_type
    const mediaType = (type === 'reel' || type === 'story') ? type : (type === 'video' ? 'video' : 'photo');

    const insertPayload: Record<string, any> = {
      user_id: user.id,
      entity_id: user.id,
      entity_type: 'user',
      media_url: url,
      media_type: mediaType,
      caption: caption || null,
      visibility,
      filter_applied: filter || null,
    };

    if (location_lat && location_lng) {
      insertPayload.location = `POINT(${Number(location_lng)} ${Number(location_lat)})`;
      insertPayload.location_name = location_name || null;
    }

    const { data: media, error: insertError } = await (supabase.from('media') as any)
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error('[Media Publish] Insert error:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Inserisci hashtags se presenti
    if (hashtags && hashtags.length > 0 && media) {
      for (const tag of hashtags) {
        const cleanTag = tag.replace(/^#/, '').toLowerCase();
        if (!cleanTag) continue;
        
        const { data: hashtagRec } = await (supabase.from('hashtags') as any)
          .upsert({ tag: cleanTag }, { onConflict: 'tag' })
          .select('id')
          .single();

        if (hashtagRec) {
          await (supabase.from('post_hashtags') as any).insert({
            post_id: media.id,
            post_type: 'media',
            hashtag_id: hashtagRec.id,
          }).on('conflict', () => {});
        }
      }
    }

    return NextResponse.json({ success: true, media });
  } catch (err: any) {
    console.error('[Media Publish] Fatal:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
