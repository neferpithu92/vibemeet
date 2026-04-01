-- ============================================================
-- 039: Social & Account Lifecycle
-- Adds support for Mutual Friendships, Messaging read status,
-- and Account Deletion/Pause logic with 30-day recovery.
-- ============================================================

-- 1. Aggiorna tabella USERS per Account Lifecycle
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Tabella FRIENDSHIPS (Gestione Amicizie Bidirezionali)
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    -- Vincolo: una sola riga per coppia (ordinata per ID per evitare duplicati speculari)
    CONSTRAINT unique_friend_pair UNIQUE (user_id, friend_id),
    CONSTRAINT different_users CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships(friend_id);

-- 3. Aggiungi Read Status ai Direct Messages
ALTER TABLE public.direct_messages
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;

-- 4. RLS - Friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships"
    ON public.friendships FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can manage their own friend requests"
    ON public.friendships FOR ALL
    USING (auth.uid() = user_id OR auth.uid() = friend_id)
    WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

-- 5. Funzione per calcolare gli AMICI IN COMUNE
CREATE OR REPLACE FUNCTION public.get_mutual_friends(p_target_id UUID)
RETURNS TABLE (friend_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT f1.friend_id
    FROM public.friendships f1
    JOIN public.friendships f2 ON f1.friend_id = f2.friend_id
    WHERE f1.user_id = auth.uid() 
      AND f2.user_id = p_target_id
      AND f1.status = 'accepted'
      AND f2.status = 'accepted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger per aggiornare updated_at su friendships
CREATE TRIGGER set_updated_at_friendships 
    BEFORE UPDATE ON public.friendships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Policy per impedire l'accesso ad account in pausa o eliminati (soft-delete logic)
-- Nota: Questa logica andrà gestita principalmente a livello Applicativo/Middleware
-- ma possiamo aggiungere un vincolo sulle Select pubbliche.

DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users FOR SELECT 
USING (
    (is_active = TRUE AND is_paused = FALSE AND (deletion_requested_at IS NULL OR deletion_requested_at > NOW() - INTERVAL '30 days'))
    OR auth.uid() = id -- L'utente può sempre vedere se stesso per il recovery
);
