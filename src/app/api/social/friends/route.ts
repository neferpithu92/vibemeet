import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API per la gestione delle amicizie (richieste, accettazioni, amici in comune).
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get('target_id');
  const type = searchParams.get('type');

  if (type === 'mutual' && targetId) {
    // Calcola amici in comune tramite funzione RPC definita in migrazione 039
    const { data, error } = await (supabase as any).rpc('get_mutual_friends', { 
      p_target_id: targetId 
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Altrimenti ritorna la lista delle amicizie dell'utente
  const { data, error } = await (supabase
    .from('friendships') as any)
    .select('*, friend_profile:users!friend_id(id, display_name, avatar_url)')
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq('status', 'accepted');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { friend_id, action } = await req.json();

  if (action === 'request') {
    // Invia richiesta di amicizia
    const { error } = await (supabase.from('friendships') as any).insert({
      user_id: user.id,
      friend_id,
      status: 'pending'
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'accept') {
    // Accetta richiesta
    const { error } = await (supabase
      .from('friendships') as any)
      .update({ status: 'accepted' })
      .match({ user_id: friend_id, friend_id: user.id });
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'remove' || action === 'decline') {
    // Rimuovi o rifiuta
    const { error } = await (supabase
      .from('friendships') as any)
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friend_id}),and(user_id.eq.${friend_id},friend_id.eq.${user.id})`);
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
