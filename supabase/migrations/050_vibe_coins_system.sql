-- ============================================================
-- 050: Vibe Coins & Wallet System
-- Implements point_transactions and spending logic.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.point_transactions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount        INTEGER NOT NULL, -- positive for earn, negative for spend
    reason        TEXT NOT NULL, -- 'daily_checkin', 'post_boost', 'gift', etc.
    metadata      JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY pt_select_own ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);

-- Funzione per spendere/guadagnare punti in sicurezza
CREATE OR REPLACE FUNCTION public.adjust_vibe_points(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT,
    p_metadata JSONB DEFAULT '{}'
) RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Se stiamo sottraendo, controlliamo il saldo
    IF p_amount < 0 THEN
        IF (SELECT vibe_points FROM users WHERE id = p_user_id) < ABS(p_amount) THEN
            RAISE EXCEPTION 'Saldo insufficiente';
        END IF;
    END IF;

    -- Aggiorna il bilancio utente
    UPDATE public.users 
    SET vibe_points = vibe_points + p_amount 
    WHERE id = p_user_id
    RETURNING vibe_points INTO v_new_balance;

    -- Registra la transazione
    INSERT INTO public.point_transactions (user_id, amount, reason, metadata)
    VALUES (p_user_id, p_amount, p_reason, p_metadata);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
