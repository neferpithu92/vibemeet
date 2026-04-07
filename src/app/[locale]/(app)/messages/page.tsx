import { createClient } from '@/lib/supabase/server';
import MessagesClient from './MessagesClient';

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch conversations with members and last message
  const { data: memberships } = await supabase
    .from('conversation_members')
    .select(`
      conversation_id,
      unread_count,
      is_muted,
      conversations (
        id,
        last_message_at,
        last_message_preview
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const convIds = (memberships || []).map((m: any) => m.conversation_id);
  let conversations: any[] = [];

  if (convIds.length > 0) {
    const { data: otherMembers } = await supabase
      .from('conversation_members')
      .select(`
        conversation_id,
        user_id,
        users:user_id (
          id,
          username,
          display_name,
          avatar_url,
          last_active_at
        )
      `)
      .in('conversation_id', convIds)
      .neq('user_id', user.id);

    conversations = (memberships || []).map((m: any) => {
      const conv = Array.isArray(m.conversations) ? m.conversations[0] : m.conversations;
      const partner = (otherMembers || []).find((om: any) => om.conversation_id === m.conversation_id);
      const partnerUser = Array.isArray(partner?.users) ? partner?.users[0] : partner?.users;
      return {
        id: conv?.id,
        last_message_at: conv?.last_message_at,
        last_message_preview: conv?.last_message_preview,
        unread_count: m.unread_count,
        is_muted: m.is_muted,
        partner: partnerUser
      };
    })
    .filter((c: any) => c.partner)
    .sort((a: any, b: any) =>
      new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
    );
  }

  return <MessagesClient conversations={conversations} currentUserId={user.id} />;
}
