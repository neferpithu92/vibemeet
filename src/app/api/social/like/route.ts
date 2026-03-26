import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route per gestire i Like (cuore ❤️) a qualsiasi entità (post, reels).
 * Inserisce o rimuove un record nella tabella "likes".
 */
export async function POST(request: Request) {
  try {
    const { entityId, entityType, action } = await request.json();
    const supabase = await createClient();

    // The user must be logged in to like
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!entityId || !entityType || !action) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    if (action === 'like') {
      // Check if already liked to prevent duplicates
      const { data: existing } = await supabase
        .from('likes')
        .select('id')
        .match({ user_id: user.id, entity_id: entityId, entity_type: entityType })
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            entity_id: entityId,
            entity_type: entityType,
          });

        if (error) throw error;
      }
      return NextResponse.json({ success: true, message: 'Like aggiunto' });
    } else if (action === 'unlike') {
      const { error } = await supabase
        .from('likes')
        .delete()
        .match({ user_id: user.id, entity_id: entityId, entity_type: entityType });

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Like rimosso' });
    }

    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 });
  } catch (error: any) {
    console.error('Errore Like API:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
