import { withApi, ok, Errors } from '@/lib/api';
import { notificationCreateSchema, notificationPatchSchema } from '@/lib/api/schemas';
import { feedQuerySchema } from '@/lib/api/schemas';
import { z } from 'zod';

/**
 * GET /api/notifications
 * Restituisce le notifiche dell'utente corrente, con profilo dell'actor.
 * Rate: 60 req/min.
 */
export const GET = withApi(
  'notifications/get',
  async (ctx, _body, query) => {
    const { supabase, user } = ctx;
    const { limit, offset } = query as { limit: number; offset: number };

    const { data, error } = await (supabase.from('notifications') as any)
      .select(`
        id,
        type,
        entity_type,
        entity_id,
        message,
        read_at,
        created_at,
        actor:users!notifications_actor_id_fkey (
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[notifications] GET error:', error.message);
      return ok({ notifications: [], unreadCount: 0 });
    }

    const notifications = data ?? [];
    const unreadCount   = notifications.filter((n: any) => !n.read_at).length;

    return ok({ notifications, unreadCount });
  },
  {
    auth:        true,
    querySchema: z.object({
      limit:  z.coerce.number().int().min(1).max(100).default(30),
      offset: z.coerce.number().int().min(0).default(0),
    }),
    rateLimit: [60, '1m'],
  }
);

/**
 * POST /api/notifications
 * Crea una notifica. Usato dalle API server-to-server.
 * Non notifica se actor === target.
 */
export const POST = withApi(
  'notifications/create',
  async (ctx, body) => {
    const { supabase, user } = ctx;
    const { user_id, actor_id, type, entity_type, entity_id, message } = body;

    // Evita auto-notifiche
    const actorId = actor_id ?? user.id;
    if (user_id === actorId) {
      return ok({ skipped: true });
    }

    const { data, error } = await (supabase.from('notifications') as any)
      .insert({
        user_id,
        actor_id: actorId,
        type,
        entity_type,
        entity_id:  entity_id ?? null,
        message,
      })
      .select('id')
      .single();

    if (error) throw Errors.internal('Impossibile creare la notifica');

    return ok({ id: data.id }, 201);
  },
  {
    auth:       true,
    bodySchema: notificationCreateSchema,
    rateLimit:  [120, '1m'],
  }
);

/**
 * PATCH /api/notifications
 * Segna notifiche come lette (singola o tutte).
 */
export const PATCH = withApi(
  'notifications/patch',
  async (ctx, body) => {
    const { supabase, user } = ctx;
    const { notificationId, markAll } = body;

    if (markAll) {
      await (supabase.from('notifications') as any)
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);
    } else if (notificationId) {
      const { error } = await (supabase.from('notifications') as any)
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);
      if (error) throw Errors.internal('Impossibile aggiornare la notifica');
    }

    return ok({ updated: true });
  },
  {
    auth:       true,
    bodySchema: notificationPatchSchema,
    rateLimit:  [60, '1m'],
  }
);

/**
 * DELETE /api/notifications?id=<uuid>
 * Elimina una singola notifica dell'utente.
 */
export const DELETE = withApi(
  'notifications/delete',
  async (ctx, _body, query) => {
    const { supabase, user } = ctx;
    const { id } = query as { id: string };

    const { error } = await (supabase.from('notifications') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw Errors.internal('Impossibile eliminare la notifica');

    return ok({ deleted: true });
  },
  {
    auth:        true,
    querySchema: z.object({ id: z.string().uuid('ID notifica non valido') }),
    rateLimit:   [30, '1m'],
  }
);
