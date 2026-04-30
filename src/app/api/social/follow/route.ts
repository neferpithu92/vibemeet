import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route per gestire i Follow (utenti, locali, artisti).
 * Usa upsert con onConflict per operazioni idempotenti.
 */
export async function POST(request: Request) {
  const { targetId, entityType, action } = await request.json();
  const supabase = await createClient();

  // Recupera l'utente corrente
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  if (!targetId || !action) {
    return NextResponse.json({ error: 'targetId e action sono obbligatori' }, { status: 400 });
  }

  const followRecord = {
    follower_id: user.id,
    following_id: targetId,
    entity_type: entityType || 'user'
  };

  if (action === 'follow') {
    // Upsert with conflict on composite PK columns
    const { error } = await (supabase
      .from('followers') as any)
      .upsert(followRecord, {
        onConflict: 'follower_id,following_id,entity_type',
        ignoreDuplicates: true
      });

    if (error) {
      console.error('[Follow] Error following:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Follow aggiunto' });
  } else if (action === 'unfollow') {
    const { error } = await (supabase
      .from('followers') as any)
      .delete()
      .match(followRecord);

    if (error) {
      console.error('[Follow] Error unfollowing:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Follow rimosso' });
  }

  return NextResponse.json({ error: 'Azione non valida. Usa "follow" o "unfollow"' }, { status: 400 });
}
