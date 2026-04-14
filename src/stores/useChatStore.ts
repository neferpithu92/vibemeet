import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { encryptDirectMessage, decryptDirectMessage } from '@/lib/encryption';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_content: string;
  nonce: string;
  media_url?: string;
  media_type?: string;
  decrypted_content?: string;
  created_at: string;
  read_at?: string;
}

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  created_at: string;
  other_user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    public_key: string;
  };
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  
  // Actions
  fetchConversations: (userId: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string, recipientId: string, recipientPublicKey: string, media?: { url: string, type: string }) => Promise<void>;
  markAsRead: (messageIds: string[]) => Promise<void>;
  handleRealtimeMessage: (payload: any) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoading: false,

  setActiveConversation: (id) => set({ activeConversationId: id, messages: [] }),

  fetchConversations: async (userId) => {
    set({ isLoading: true });
    const supabase = createClient();
    
    // Recupera conversazioni e dati degli utenti (JOIN)
    const { data, error } = await (supabase
      .from('conversations') as any)
      .select(`
        *,
        user1:users!user1_id(*),
        user2:users!user2_id(*)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      set({ isLoading: false });
      return;
    }

    const processed = (data as any[]).map(conv => {
      const otherUser = conv.user1_id === userId ? conv.user2 : conv.user1;
      return { ...conv, other_user: otherUser };
    });

    set({ conversations: processed, isLoading: false });
  },

  fetchMessages: async (conversationId) => {
    set({ isLoading: true });
    const supabase = createClient();
    
    const { data, error } = await (supabase
      .from('direct_messages') as any)
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      set({ isLoading: false });
      return;
    }

    // Decifratura Locale dei messaggi
    const privateKey = sessionStorage.getItem('vibe_private_key');
    const conversation = get().conversations.find(c => c.id === conversationId);
    const otherPublicKey = conversation?.other_user?.public_key;

    if (!privateKey || !otherPublicKey) {
      set({ messages: data as any[], isLoading: false });
      return;
    }

    const decrypted = await Promise.all((data as any[]).map(async msg => {
      const senderPublicKey = msg.sender_id === conversation?.other_user?.id 
        ? otherPublicKey 
        : sessionStorage.getItem('vibe_public_key');
        
      if (!senderPublicKey) return msg;

      try {
        const content = await decryptDirectMessage(
          msg.encrypted_content, 
          senderPublicKey, 
          privateKey
        );
        return { ...msg, decrypted_content: content };
      } catch (e) {
        return msg;
      }
    }));

    set({ messages: decrypted, isLoading: false });
  },

  sendMessage: async (content, recipientId, recipientPublicKey, media) => {
    const supabase = createClient();
    const myPrivateKey = sessionStorage.getItem('vibe_private_key');
    
    if (!myPrivateKey || !recipientPublicKey) {
       throw new Error("Encryption keys missing. Failed to send E2E message.");
    }

    const { data: convId } = await (supabase as any).rpc('get_or_create_conversation', { p_user_id: recipientId });
    if (!convId) throw new Error("Could not initialize conversation.");

    const encryptedPayload = await encryptDirectMessage(content, recipientPublicKey, myPrivateKey);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await (supabase.from('direct_messages') as any).insert({
      conversation_id: convId,
      sender_id: userData.user.id,
      encrypted_content: encryptedPayload,
      nonce: encryptedPayload.substring(0, 32),
      media_url: media?.url,
      media_type: media?.type
    });

    if (error) throw error;
  },

  markAsRead: async (messageIds) => {
    if (messageIds.length === 0) return;
    const supabase = createClient();
    await (supabase.from('direct_messages') as any)
      .update({ read_at: new Date().toISOString() })
      .in('id', messageIds);
    
    set(state => ({
      messages: state.messages.map(m => 
        messageIds.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m
      )
    }));
  },

  handleRealtimeMessage: async (payload) => {
    const msg = payload.new;
    if (msg.conversation_id !== get().activeConversationId) return;

    const privateKey = sessionStorage.getItem('vibe_private_key');
    const conversation = get().conversations.find(c => c.id === msg.conversation_id);
    const otherPublicKey = conversation?.other_user?.public_key;

    if (!privateKey || !otherPublicKey) {
      set(state => ({ messages: [...state.messages, msg] }));
      return;
    }

    const senderPublicKey = msg.sender_id === conversation?.other_user?.id 
        ? otherPublicKey 
        : sessionStorage.getItem('vibe_public_key');

    try {
      const content = await decryptDirectMessage(msg.encrypted_content, senderPublicKey!, privateKey);
      const decryptedMsg = { ...msg, decrypted_content: content };
      set(state => ({ messages: [...state.messages, decryptedMsg] }));
    } catch (e) {
      set(state => ({ messages: [...state.messages, msg] }));
    }
  }
}));
