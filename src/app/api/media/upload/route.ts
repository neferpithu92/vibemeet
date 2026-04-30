import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route per l'upload di file su Supabase Storage.
 * Gestisce il caricamento nei bucket 'media' o 'stories'.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string; // 'media' | 'stories'
    const entityType = formData.get('entityType') as string; // 'user' | 'venue' | 'event'
    const entityId = formData.get('entityId') as string;
    const caption = formData.get('caption') as string;

    if (!file || !bucket) {
      return NextResponse.json({ error: 'File e bucket sono obbligatori' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Security Check: Verify target ownership
    if (entityType === 'venue') {
      const { data: venue } = await (supabase.from('venues') as any).select('owner_id').eq('id', entityId).single();
      if (!venue || (venue as any).owner_id !== user.id) return NextResponse.json({ error: 'Vietato caricare su questa Venue' }, { status: 403 });
    } else if (entityType === 'event') {
      const { data: event } = await (supabase.from('events') as any).select('organizer_id').eq('id', entityId).single();
      if (!event || (event as any).organizer_id !== user.id) return NextResponse.json({ error: 'Vietato caricare su questo Evento' }, { status: 403 });
    } else if (entityType === 'user' && entityId !== user.id) {
       return NextResponse.json({ error: 'Vietato caricare su profili altrui' }, { status: 403 });
    }

    // Genera un nome file unico
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
    const filePath = fileName;

    // 1. Carica il file su Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      });

    if (storageError) {
      console.error(`[Upload] Storage error in bucket ${bucket}:`, storageError);
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }

    // 2. Ottieni l'URL pubblico del file
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    // 3. Inserisci il record nella tabella corrispondente
    if (bucket === 'stories') {
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({
          author_id: user.id,
          media_url: publicUrl,
          type: file.type.startsWith('video') ? 'video' : 'photo',
          caption: caption || null,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          entity_type: 'user'
        })
        .select()
        .single();

      if (storyError) {
        console.error('[Upload] Database error inserting into stories:', storyError);
        return NextResponse.json({ error: `DB Error: ${storyError.message}` }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: story });
    } else {
      // Inserisci in 'media' per i post del feed
      const { data: media, error: mediaError } = await supabase
        .from('media')
        .insert({
          author_id: user.id,
          entity_type: entityType || 'user',
          entity_id: entityId || user.id,
          url: publicUrl,
          type: file.type.startsWith('video') ? 'video' : 'photo',
          caption: caption || null
        })
        .select()
        .single();

      if (mediaError) {
        console.error('[Upload] Database error inserting into media:', mediaError);
        return NextResponse.json({ error: `DB Error: ${mediaError.message}` }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: media });
    }

  } catch (error: any) {
    console.error('[Upload] Fatal exception:', error);
    return NextResponse.json({ error: `Fatal: ${error.message}` }, { status: 500 });
  }
}
