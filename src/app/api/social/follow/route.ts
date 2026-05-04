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
    // Check if target user is private
    let isPrivate = false;
    if (entityType === 'user') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('account_type')
        .eq('id', targetId)
        .single();
      isPrivate = targetUser?.account_type === 'private';
    }

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

    // If private, manage friendship
    if (isPrivate) {
      const { error: friendError } = await (supabase
        .from('friendships') as any)
        .upsert({
          requester_id: user.id,
          addressee_id: targetId,
          status: 'pending'
        }, { onConflict: 'requester_id,addressee_id' });
      
      if (friendError) console.error('[Follow] Friendship Error:', friendError.message);
    }
    
    return NextResponse.json({ success: true, message: isPrivate ? 'Richiesta inviata' : 'Follow aggiunto' });
  } else if (action === 'unfollow') {
    // Delete from followers
    const { error } = await (supabase
      .from('followers') as any)
      .delete()
      .match(followRecord);

    if (error) {
      console.error('[Follow] Error unfollowing:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also remove friendship if it exists
    if (entityType === 'user') {
      await (supabase
        .from('friendships') as any)
        .delete()
        .match({ requester_id: user.id, addressee_id: targetId });
    }

    return NextResponse.json({ success: true, message: 'Follow rimosso' });
  }

  return NextResponse.json({ error: 'Azione non valida. Usa "follow" o "unfollow"' }, { status: 400 });
}
