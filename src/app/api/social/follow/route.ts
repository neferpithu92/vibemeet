import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route per gestire i Follow (utenti, locali, artisti).
 */
export async function POST(request: Request) {
  const { targetId, entityType, action } = await request.json();
  const supabase = await createClient();

  // Recupera l'utente corrente
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  if (action === 'follow') {
    const { error } = await supabase
      .from('followers')
      .upsert({
        follower_id: user.id,
        following_id: targetId,
        entity_type: entityType || 'user'
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Follow aggiunto' });
  } else if (action === 'unfollow') {
    const { error } = await supabase
      .from('followers')
      .delete()
      .match({
        follower_id: user.id,
        following_id: targetId,
        entity_type: entityType || 'user'
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Follow rimosso' });
  }

  return NextResponse.json({ error: 'Azione non valida' }, { status: 400 });
}
