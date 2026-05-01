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
  setTyping: (isTyping: boolean) => void;
  typingUsers: string[];
  setTypingUsers: (users: string[]) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoading: false,
  typingUsers: [],

  setTypingUsers: (users) => set({ typingUsers: users }),
  
  setTyping: async (isTyping) => {
    const convId = get().activeConversationId;
    if (!convId) return;
    const supabase = createClient();
    const channel = supabase.channel(`chat_${convId}`);
    if (isTyping) {
      await channel.track({ typing: true, user_id: (await supabase.auth.getUser()).data.user?.id });
    } else {
      await channel.untrack();
    }
  },

  setActiveConversation: (id) => set({ activeConversationId: id, messages: [] }),

  fetchConversations: async (userId) => {
    set({ isLoading: true });
    const supabase = createClient();
    
    // Recupera conversazioni e dati degli utenti (JOIN)
    const { data, error } = await supabase
      .from('conversations' as any)
      .select(`
        *,
        user1:users!conversations_user1_id_fkey(*),
        user2:users!conversations_user2_id_fkey(*)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error("[Chat] Error fetching conversations:", error);
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
    
    const { data, error } = await supabase
      .from('direct_messages' as any)
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("[Chat] Error fetching messages:", error);
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
       console.error('[Chat] Encryption keys missing');
       throw new Error("Encryption keys missing. Failed to send E2E message.");
    }

    console.log('[Chat] Getting or creating conversation for:', recipientId);
    const { data: convId, error: rpcError } = await (supabase as any).rpc('get_or_create_conversation', { p_user_id: recipientId });
    if (rpcError || !convId) {
      console.error('[Chat] RPC Error:', rpcError);
      throw new Error("Could not initialize conversation.");
    }

    // encryptDirectMessage returns base64(nonce || ciphertext)
    // We store the full payload in encrypted_content and extract the real nonce separately
    const encryptedPayload = await encryptDirectMessage(content, recipientPublicKey, myPrivateKey);

    // Dynamically import libsodium to get NONCEBYTES for correct extraction
    let nonceB64: string;
    try {
      const { initSodium } = await import('@/lib/encryption');
      const sodium = await initSodium();
      if (sodium) {
        const payloadBytes = sodium.from_base64(encryptedPayload);
        const nonceBytes = payloadBytes.slice(0, sodium.crypto_box_NONCEBYTES);
        nonceB64 = sodium.to_base64(nonceBytes);
      } else {
        // Fallback: generate a separate nonce identifier (won't be used for decryption — payload is self-contained)
        nonceB64 = crypto.randomUUID();
      }
    } catch {
      nonceB64 = crypto.randomUUID();
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase.from('direct_messages').insert({
      conversation_id: convId,
      sender_id: userData.user.id,
      encrypted_content: encryptedPayload,
      nonce: nonceB64,
      media_url: media?.url,
      media_type: media?.type
    });

    if (error) {
      console.error('[Chat] Error inserting message:', error);
      throw error;
    }
  },

  markAsRead: async (messageIds) => {
    if (messageIds.length === 0) return;
    const supabase = createClient();
    
    const { error } = await supabase.from('direct_messages' as any)
      .update({ read_at: new Date().toISOString() })
      .in('id', messageIds);
    
    if (error) console.error('[Chat] Error marking as read:', error);
    
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
