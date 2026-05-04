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

    // 3. Ritorna l'URL pubblico (l'inserimento nel DB viene gestito dai chiamanti)
    return NextResponse.json({ 
      success: true, 
      url: publicUrl 
    });

  } catch (error: any) {
    console.error('[Upload] Fatal exception:', error);
    return NextResponse.json({ error: `Fatal: ${error.message}` }, { status: 500 });
  }
}
