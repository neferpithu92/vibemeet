import { createClient } from '@/lib/supabase/server';
import ChatClient from './ChatClient';
import { notFound } from 'next/navigation';

export default async function ChatPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: partnerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return notFound();

  // Get partner info
  const { data: partner } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, last_active_at')
    .eq('id', partnerId)
    .single();

  if (!partner) return notFound();

  // Find existing conversation: get all convIds for current user, then check overlap with partner
  const { data: myMemberships } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', user.id);

  const { data: partnerMemberships } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', partnerId);

  const myConvIds = (myMemberships || []).map((m: any) => m.conversation_id);
  const partnerConvIds = (partnerMemberships || []).map((m: any) => m.conversation_id);
  const sharedConvIds = myConvIds.filter((id: string) => partnerConvIds.includes(id));

  let conversationId: string | null = sharedConvIds[0] || null;

  // Create conversation if none exists
  if (!conversationId) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ last_message_at: new Date().toISOString() })
      .select('id')
      .single();

    if (newConv) {
      conversationId = newConv.id;
      await supabase.from('conversation_members').insert([
        { conversation_id: conversationId, user_id: user.id },
        { conversation_id: conversationId, user_id: partnerId }
      ]);
    }
  }

  // Load initial messages
  const { data: messages } = conversationId
    ? await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(50)
    : { data: [] };

  return (
    <ChatClient
      partner={partner}
      currentUserId={user.id}
      conversationId={conversationId || ''}
      initialMessages={messages || []}
    />
  );
}
