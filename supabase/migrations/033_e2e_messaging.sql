-- ============================================================
-- 033: E2E Messaging Infrastructure
-- Implements tables for encrypted direct messaging and conversations.
-- ============================================================

-- 1. Tabella Conversations (Metadata per raggruppare i messaggi)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Vincolo: user1_id deve essere minore di user2_id per avere un'unica riga per coppia
    CONSTRAINT unique_conversation_pair UNIQUE (user1_id, user2_id),
    CONSTRAINT different_users CHECK (user1_id <> user2_id)
);

-- Index per velocizzare il recupero delle conversazioni per utente
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON public.conversations(user2_id);

-- 2. Tabella Direct Messages (Payload Cifrati)
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    encrypted_content TEXT NOT NULL,
    nonce TEXT NOT NULL,
    crypto_version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index per velocizzare il recupero cronologico dei messaggi in una conversazione
CREATE INDEX IF NOT EXISTS idx_messages_conversation_time ON public.direct_messages(conversation_id, created_at DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Politiche per Conversations: Utente può vedere solo le conversazioni dove è partecipe
CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Politiche per Direct Messages: Utente può vedere solo i messaggi delle proprie conversazioni
CREATE POLICY "Users can view messages in their conversations"
ON public.direct_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = direct_messages.conversation_id
        AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
    )
);

CREATE POLICY "Users can send messages in their conversations"
ON public.direct_messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = direct_messages.conversation_id
        AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
    )
);

-- Trigger per aggiornare last_message_at nella tabella conversations
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = now()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_update_conversation_time
AFTER INSERT ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- 4. Funzione Helper per trovare o creare una conversazione (Atomics)
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_user1 UUID;
    v_user2 UUID;
    v_conv_id UUID;
BEGIN
    -- Ordiniamo i due UUID per rispettare il vincolo unique_conversation_pair
    IF auth.uid() < p_user_id THEN
        v_user1 := auth.uid();
        v_user2 := p_user_id;
    ELSE
        v_user1 := p_user_id;
        v_user2 := auth.uid();
    END IF;

    -- Upsert atomico
    INSERT INTO public.conversations (user1_id, user2_id)
    VALUES (v_user1, v_user2)
    ON CONFLICT (user1_id, user2_id) DO UPDATE SET last_message_at = now()
    RETURNING id INTO v_conv_id;

    RETURN v_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Aggiornamento Trigger handle_new_user per supportare VEL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, display_name, avatar_url, public_key)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      LOWER(REPLACE(new.raw_user_meta_data->>'username', ' ', '_')), 
      LOWER(REPLACE(split_part(new.email, '@', 1), '.', '_'))
    ),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'public_key' -- Inserimento chiave VEL Registry
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Backfill: Sincronizza chiavi pubbliche esistenti da auth.users a public.users
UPDATE public.users u
SET public_key = a.raw_user_meta_data->>'public_key'
FROM auth.users a
WHERE u.id = a.id 
AND u.public_key IS NULL 
AND a.raw_user_meta_data->>'public_key' IS NOT NULL;

