import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route per gestire i Like (cuore ❤️) a qualsiasi entità (post, reels).
 * Inserisce o rimuove un record nella tabella "likes".
 * Aggiorna like_count e invia notifiche in tempo reale.
 */
export async function POST(request: Request) {
  try {
    const { entityId, entityType, action } = await request.json();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!entityId || !entityType || !action) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    if (action === 'like') {
      const { data: existing } = await (supabase
        .from('likes') as any)
        .select('user_id')
        .match({ user_id: user.id, entity_id: entityId, entity_type: entityType })
        .maybeSingle();

      if (!existing) {
        const { error } = await (supabase
          .from('likes') as any)
          .insert({
            user_id: user.id,
            entity_id: entityId,
            entity_type: entityType,
          });

        if (error) throw error;

        // Aggiorna like_count nel media
        const { data: mediaRow } = await (supabase.from('media') as any)
          .select('like_count, user_id')
          .eq('id', entityId)
          .maybeSingle();
        
        if (mediaRow) {
          await (supabase.from('media') as any)
            .update({ like_count: (mediaRow.like_count || 0) + 1 })
            .eq('id', entityId);

          // Invia notifica al proprietario del post (non a se stessi)
          if (mediaRow.user_id && mediaRow.user_id !== user.id) {
            const { data: likerProfile } = await (supabase.from('users') as any)
              .select('display_name, username')
              .eq('id', user.id)
              .single();
            
            const likerName = likerProfile?.display_name || likerProfile?.username || 'Qualcuno';
            
            await (supabase.from('notifications') as any).insert({
              user_id: mediaRow.user_id,
              actor_id: user.id,
              type: 'like',
              entity_type: entityType,
              entity_id: entityId,
              message: `${likerName} ha messo like al tuo post ❤️`,
              read_at: null,
            });
          }
        }
      }
      return NextResponse.json({ success: true, message: 'Like aggiunto' });
    } else if (action === 'unlike') {
      const { error } = await (supabase
        .from('likes') as any)
        .delete()
        .match({ user_id: user.id, entity_id: entityId, entity_type: entityType });

      if (error) throw error;

      // Decrementa like_count
      const { data: mediaRow } = await (supabase.from('media') as any)
        .select('like_count')
        .eq('id', entityId)
        .maybeSingle();
      if (mediaRow) {
        await (supabase.from('media') as any)
          .update({ like_count: Math.max(0, (mediaRow.like_count || 1) - 1) })
          .eq('id', entityId);
      }

      return NextResponse.json({ success: true, message: 'Like rimosso' });
    }

    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 });
  } catch (error: any) {
    console.error('Errore Like API:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
