import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/notifications
 * Crea una notifica per un utente.
 * Usato internamente da follow, like, comment API.
 */
export async function POST(request: Request) {
  try {
    const { user_id, actor_id, type, entity_type, entity_id, message } = await request.json();
    const supabase = await createClient();

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!user_id || !type || !message) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    // Non creare notifiche per azioni proprie
    if (user_id === actor_id) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const { data, error } = await (supabase.from('notifications') as any).insert({
      user_id,
      actor_id: actor_id || user.id,
      type,
      entity_type: entity_type || 'system',
      entity_id: entity_id || null,
      message,
      read_at: null,
    }).select().single();

    if (error) {
      console.error('[Notifications API] Insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[Notifications API] Fatal:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/notifications
 * Recupera le notifiche per l'utente corrente.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { data, error } = await (supabase.from('notifications') as any)
      .select(`
        *,
        actor:users!notifications_actor_id_fkey (
          display_name,
          avatar_url,
          username
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[Notifications GET] Error:', error.message);
      return NextResponse.json({ notifications: [] });
    }

    return NextResponse.json({ notifications: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Segna notifiche come lette.
 */
export async function PATCH(request: Request) {
  try {
    const { notificationId, markAll } = await request.json();
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (markAll) {
      await (supabase.from('notifications') as any)
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);
    } else if (notificationId) {
      await (supabase.from('notifications') as any)
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
