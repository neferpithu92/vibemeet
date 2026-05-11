import { NextRequest } from 'next/server';
import { withApi, ok, Errors } from '@/lib/api';
import { likeSchema } from '@/lib/api/schemas';

/**
 * POST /api/social/like
 * Toggle like/unlike su media. Aggiorna like_count e invia notifica.
 * Rate: 60 req/min per utente.
 */
export const POST = withApi(
  'social/like',
  async (ctx, body) => {
    const { entityId, entityType, action } = body;
    const { supabase, user } = ctx;

    // ── Controlla se già liked ─────────────────────────────
    const { data: existing } = await (supabase.from('likes') as any)
      .select('user_id')
      .match({ user_id: user.id, entity_id: entityId, entity_type: entityType })
      .maybeSingle();

    if (action === 'like') {
      if (existing) {
        return ok({ alreadyLiked: true, message: 'Già in like' });
      }

      // Inserisci like
      const { error: insertError } = await (supabase.from('likes') as any).insert({
        user_id:     user.id,
        entity_id:   entityId,
        entity_type: entityType,
      });
      if (insertError) throw Errors.internal('Impossibile aggiungere il like');

      // Aggiorna like_count e recupera owner
      const { data: mediaRow } = await (supabase.from('media') as any)
        .select('like_count, user_id')
        .eq('id', entityId)
        .maybeSingle();

      if (mediaRow) {
        await (supabase.from('media') as any)
          .update({ like_count: (mediaRow.like_count ?? 0) + 1 })
          .eq('id', entityId);

        // Notifica al proprietario (fire-and-forget, non blocca la risposta)
        if (mediaRow.user_id && mediaRow.user_id !== user.id) {
          const { data: liker } = await (supabase.from('users') as any)
            .select('display_name, username')
            .eq('id', user.id)
            .single();

          const name = liker?.display_name || liker?.username || 'Qualcuno';

          (supabase.from('notifications') as any)
            .insert({
              user_id:     mediaRow.user_id,
              actor_id:    user.id,
              type:        'like',
              entity_type: entityType,
              entity_id:   entityId,
              message:     `${name} ha messo like al tuo post ❤️`,
            })
            .then(({ error }: any) => {
              if (error) console.warn('[like] notif error:', error.message);
            });
        }
      }

      return ok({ liked: true, likeCount: (mediaRow?.like_count ?? 0) + 1 });
    }

    // ── Unlike ─────────────────────────────────────────────
    if (!existing) {
      return ok({ liked: false, message: 'Non eri in like' });
    }

    const { error: delError } = await (supabase.from('likes') as any)
      .delete()
      .match({ user_id: user.id, entity_id: entityId, entity_type: entityType });
    if (delError) throw Errors.internal('Impossibile rimuovere il like');

    // Decrementa like_count
    const { data: mediaRow } = await (supabase.from('media') as any)
      .select('like_count')
      .eq('id', entityId)
      .maybeSingle();

    if (mediaRow) {
      await (supabase.from('media') as any)
        .update({ like_count: Math.max(0, (mediaRow.like_count ?? 1) - 1) })
        .eq('id', entityId);
    }

    return ok({ liked: false, likeCount: Math.max(0, (mediaRow?.like_count ?? 1) - 1) });
  },
  {
    auth:        true,
    bodySchema:  likeSchema,
    rateLimit:   [60, '1m'],
  }
);
