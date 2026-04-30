-- ============================================================
-- MASTER ALIGNMENT V4: VibeMeet Alpha Production Ready
-- ============================================================

BEGIN;

-- 1. ALLINEAMENTO TABELLA 'stories'
-- Molti errori "schema cache" derivano dalla mancanza della colonna 'type'
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stories' AND column_name='type') THEN
        ALTER TABLE public.stories ADD COLUMN "type" TEXT NOT NULL DEFAULT 'photo' CHECK ("type" IN ('photo','video','text'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stories' AND column_name='text_content') THEN
        ALTER TABLE public.stories ADD COLUMN "text_content" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stories' AND column_name='text_color') THEN
        ALTER TABLE public.stories ADD COLUMN "text_color" TEXT DEFAULT '#FFFFFF';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stories' AND column_name='bg_color') THEN
        ALTER TABLE public.stories ADD COLUMN "bg_color" TEXT DEFAULT '#7C3AED';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stories' AND column_name='duration') THEN
        ALTER TABLE public.stories ADD COLUMN "duration" INTEGER DEFAULT 5;
    END IF;
END $$;

-- RLS per stories
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stories_insert_policy" ON public.stories;
CREATE POLICY "stories_insert_policy" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "stories_select_policy" ON public.stories;
CREATE POLICY "stories_select_policy" ON public.stories FOR SELECT USING (true);

-- 2. CREAZIONE TABELLA 'point_transactions' (Mancante)
CREATE TABLE IF NOT EXISTS public.point_transactions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount        INTEGER NOT NULL,
    reason        TEXT NOT NULL,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pt_select_own ON public.point_transactions;
CREATE POLICY pt_select_own ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);

-- 3. ALLINEAMENTO TABELLA 'users'
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='vibe_points') THEN
        ALTER TABLE public.users ADD COLUMN "vibe_points" INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='onboarding_completed') THEN
        ALTER TABLE public.users ADD COLUMN "onboarding_completed" BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- 4. FUNZIONI RPC ESSENZIALI
-- Funzione per aggiornare i punti
CREATE OR REPLACE FUNCTION public.adjust_vibe_points(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT,
    p_metadata JSONB DEFAULT '{}'
) RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    UPDATE public.users 
    SET vibe_points = vibe_points + p_amount 
    WHERE id = p_user_id
    RETURNING vibe_points INTO v_new_balance;

    INSERT INTO public.point_transactions (user_id, amount, reason, metadata)
    VALUES (p_user_id, p_amount, p_reason, p_metadata);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. REFRESH SCHEMA CACHE (Indiretto)
NOTIFY pgrst, 'reload schema';

COMMIT;
