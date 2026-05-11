import { NextRequest } from 'next/server';
import { withApi, ok, Errors } from '@/lib/api';
import { followSchema } from '@/lib/api/schemas';

/**
 * POST /api/social/follow
 * Follow/unfollow utente, venue o artista.
 * Genera notifiche e aggiorna follower_count via trigger DB.
 * Rate: 30 req/min.
 */
export const POST = withApi(
  'social/follow',
  async (ctx, body) => {
    const { targetId, entityType, action } = body;
    const { supabase, user } = ctx;

    // Prevenzione self-follow
    if (entityType === 'user' && user.id === targetId) {
      throw Errors.badRequest('Non puoi seguire te stesso');
    }

    const followRecord = {
      follower_id:  user.id,
      following_id: targetId,
      entity_type:  entityType,
    };

    if (action === 'follow') {
      // Controlla duplicato
      const { data: existing } = await (supabase.from('followers') as any)
        .select('follower_id')
        .match(followRecord)
        .maybeSingle();

      if (existing) {
        return ok({ following: true, message: 'Già seguito' });
      }

      // Controlla se l'account target è privato
      let isPrivate = false;
      let targetName = '';

      if (entityType === 'user') {
        const { data: targetUser } = await (supabase.from('users') as any)
          .select('account_type, display_name, username')
          .eq('id', targetId)
          .single();

        if (!targetUser) throw Errors.notFound('Utente non trovato');
        isPrivate  = targetUser.account_type === 'private';
        targetName = targetUser.display_name || targetUser.username;
      }

      // Inserisci follow
      const { error: insertErr } = await (supabase.from('followers') as any)
        .insert(followRecord);
      if (insertErr) throw Errors.internal('Impossibile aggiungere il follow');

      // Recupera nome del follower per la notifica
      const { data: follower } = await (supabase.from('users') as any)
        .select('display_name, username')
        .eq('id', user.id)
        .single();

      const followerName = follower?.display_name || follower?.username || 'Qualcuno';

      // Notifica — fire-and-forget
      if (entityType === 'user') {
        (supabase.from('notifications') as any)
          .insert({
            user_id:     targetId,
            actor_id:    user.id,
            type:        'follow',
            entity_type: 'user',
            entity_id:   user.id,
            message:     `${followerName} ha iniziato a seguirti 👋`,
          })
          .then(({ error }: any) => {
            if (error) console.warn('[follow] notif error:', error.message);
          });
      }

      // Se privato, crea friendship pending
      if (isPrivate) {
        await (supabase.from('friendships') as any)
          .upsert(
            { requester_id: user.id, addressee_id: targetId, status: 'pending' },
            { onConflict: 'requester_id,addressee_id' }
          );
      }

      return ok({
        following: true,
        pending:   isPrivate,
        message:   isPrivate ? 'Richiesta di follow inviata' : `Ora segui ${targetName || targetId}`,
      });
    }

    // ── Unfollow ────────────────────────────────────────────
    const { data: existing } = await (supabase.from('followers') as any)
      .select('follower_id')
      .match(followRecord)
      .maybeSingle();

    if (!existing) {
      return ok({ following: false, message: 'Non stavi seguendo' });
    }

    const { error: delErr } = await (supabase.from('followers') as any)
      .delete()
      .match(followRecord);
    if (delErr) throw Errors.internal('Impossibile rimuovere il follow');

    // Rimuovi eventuale friendship
    if (entityType === 'user') {
      await (supabase.from('friendships') as any)
        .delete()
        .or(
          `requester_id.eq.${user.id}.and.addressee_id.eq.${targetId},` +
          `requester_id.eq.${targetId}.and.addressee_id.eq.${user.id}`
        );
    }

    return ok({ following: false, message: 'Non segui più' });
  },
  {
    auth:       true,
    bodySchema: followSchema,
    rateLimit:  [30, '1m'],
  }
);
