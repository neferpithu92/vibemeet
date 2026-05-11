import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route per gestire i Follow (utenti, locali, artisti).
 * Usa upsert con onConflict per operazioni idempotenti.
 * Genera notifiche per i nuovi follow.
 */
export async function POST(request: Request) {
  try {
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

    // Prevent self-follow
    if (user.id === targetId) {
      return NextResponse.json({ error: 'Non puoi seguire te stesso' }, { status: 400 });
    }

    const followRecord = {
      follower_id: user.id,
      following_id: targetId,
      entity_type: entityType || 'user'
    };

    if (action === 'follow') {
      // Check if target user is private
      let isPrivate = false;
      let targetUserName = '';
      if (entityType === 'user' || !entityType) {
        const { data: targetUser } = await (supabase
          .from('users') as any)
          .select('account_type, display_name, username')
          .eq('id', targetId)
          .single();
        isPrivate = targetUser?.account_type === 'private';
        targetUserName = targetUser?.display_name || targetUser?.username || 'Utente';
      }

      // Get follower display name for notification
      const { data: followerProfile } = await (supabase
        .from('users') as any)
        .select('display_name, username')
        .eq('id', user.id)
        .single();
      const followerName = followerProfile?.display_name || followerProfile?.username || 'Qualcuno';

      // Check for duplicate follow
      const { data: existing } = await (supabase
        .from('followers') as any)
        .select('follower_id')
        .match(followRecord)
        .maybeSingle();

      if (!existing) {
        // Insert follow record
        const { error } = await (supabase
          .from('followers') as any)
          .insert(followRecord);

        if (error) {
          console.error('[Follow] Error following:', error.message);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Send follow notification (fire-and-forget)
        if (entityType === 'user' || !entityType) {
          (supabase.from('notifications') as any).insert({
            user_id: targetId,
            actor_id: user.id,
            type: 'follow',
            entity_type: 'user',
            entity_id: user.id,
            message: `${followerName} ha iniziato a seguirti`,
            read_at: null,
          }).then(({ error: notifError }: any) => {
            if (notifError) console.error('[Follow] Notification error:', notifError.message);
          });
        }
      }

      // If private, manage friendship request
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
      if (entityType === 'user' || !entityType) {
        await (supabase
          .from('friendships') as any)
          .delete()
          .or(`requester_id.eq.${user.id}.and.addressee_id.eq.${targetId},requester_id.eq.${targetId}.and.addressee_id.eq.${user.id}`);
      }

      return NextResponse.json({ success: true, message: 'Follow rimosso' });
    }

    return NextResponse.json({ error: 'Azione non valida. Usa "follow" o "unfollow"' }, { status: 400 });
  } catch (err: any) {
    console.error('[Follow] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
