-- ============================================================
-- 999: PRODUCTION MASTER SYNC (VIBE ALPHA ROLLOUT)
-- Eseguire questo script nello SQL Editor di Supabase per
-- risolvere definitivamente gli errori 404 e attivare la chat cifrata.
-- ============================================================

BEGIN;

-- 1. Tabelle Core (Assicurazione Esistenza)
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  theme_preset TEXT DEFAULT 'system',
  custom_theme_hsl JSONB DEFAULT '{"h": 260, "s": 100, "l": 60}'::jsonb,
  is_private BOOLEAN DEFAULT false,
  show_activity BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  usage_limit_minutes INTEGER DEFAULT 0,
  language TEXT DEFAULT 'it',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_onboarding_interests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  selected_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- 2. Chat E2E System
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_conversation_pair UNIQUE (user1_id, user2_id),
    CONSTRAINT different_users CHECK (user1_id <> user2_id)
);

CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    encrypted_content TEXT NOT NULL,
    nonce TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS per Chat
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conv_own" ON public.conversations;
CREATE POLICY "conv_own" ON public.conversations FOR ALL USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "msg_view" ON public.direct_messages;
CREATE POLICY "msg_view" ON public.direct_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id))
);

DROP POLICY IF EXISTS "msg_send" ON public.direct_messages;
CREATE POLICY "msg_send" ON public.direct_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id))
);

-- 3. Funzioni RPC Critiche
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_user1 UUID;
    v_user2 UUID;
    v_conv_id UUID;
BEGIN
    IF auth.uid() < p_user_id THEN
        v_user1 := auth.uid(); v_user2 := p_user_id;
    ELSE
        v_user1 := p_user_id; v_user2 := auth.uid();
    END IF;

    INSERT INTO public.conversations (user1_id, user2_id)
    VALUES (v_user1, v_user2)
    ON CONFLICT (user1_id, user2_id) DO UPDATE SET last_message_at = now()
    RETURNING id INTO v_conv_id;

    RETURN v_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

  -- 4. RPC: increment_usage
-- Required by the app analytics client to track active minutes
CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.usage_stats (user_id, date, minutes_used)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    minutes_used = public.usage_stats.minutes_used + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Aggiornamento Tabella Users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS public_key TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Trigger per inizializzazione settings e sincronizzazione chiavi VEL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, display_name, avatar_url, public_key)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(LOWER(REPLACE(NEW.raw_user_meta_data->>'username', ' ', '_')), split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'public_key'
  ) ON CONFLICT (id) DO UPDATE SET 
    public_key = COALESCE(public.users.public_key, EXCLUDED.public_key);

  INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: get_venues_in_bounds
CREATE OR REPLACE FUNCTION public.get_venues_in_bounds(
  sw_lat FLOAT,
  sw_lng FLOAT,
  ne_lat FLOAT,
  ne_lng FLOAT
)
RETURNS SETOF public.venues AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.venues
  WHERE location && ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMIT;
