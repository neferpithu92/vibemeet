import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API per la gestione della messaggistica (Conversazioni e Messaggi Diretti).
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversation_id');
  const recipientId = searchParams.get('recipient_id');

  // Se viene passato recipient_id, cerchiamo o creiamo la conversazione
  if (recipientId) {
    const { data: convId, error: convError } = await (supabase as any).rpc('get_or_create_conversation', {
      p_user_id: recipientId
    });
    if (convError) return NextResponse.json({ error: convError.message }, { status: 500 });
    return NextResponse.json({ conversation_id: convId });
  }

  // Se viene passato conversation_id, recuperiamo i messaggi
  if (conversationId) {
    // Security check: user must be part of the conversation
    const { data: conversation } = await (supabase
      .from('conversations') as any)
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single();

    if (!conversation || ((conversation as any).user1_id !== user.id && (conversation as any).user2_id !== user.id)) {
      return NextResponse.json({ error: 'Vietato accedere a conversazioni altrui' }, { status: 403 });
    }

    const { data: messages, error: msgError } = await (supabase
      .from('direct_messages') as any)
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 });
    
    // Segna come letti i messaggi non propri
    await (supabase.from('direct_messages') as any).update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null);

    return NextResponse.json(messages);
  }

  // Altrimenti, ritorna la lista delle conversazioni
  const { data: conversations, error: listError } = await (supabase
    .from('conversations') as any)
    .select(`
      *,
      user1:users!user1_id(id, display_name, avatar_url),
      user2:users!user2_id(id, display_name, avatar_url)
    `)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false });

  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });
  return NextResponse.json(conversations);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { conversation_id, encrypted_content, nonce } = await req.json();

  if (!conversation_id || !encrypted_content || !nonce) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Security check: user must be part of the conversation
  const { data: conversation } = await (supabase
    .from('conversations') as any)
    .select('user1_id, user2_id')
    .eq('id', conversation_id)
    .single();

  if (!conversation || ((conversation as any).user1_id !== user.id && (conversation as any).user2_id !== user.id)) {
    return NextResponse.json({ error: 'Vietato postare in conversazioni altrui' }, { status: 403 });
  }

  const { data, error } = await (supabase.from('direct_messages') as any).insert({
    conversation_id,
    sender_id: user.id,
    encrypted_content,
    nonce,
    crypto_version: 1
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
