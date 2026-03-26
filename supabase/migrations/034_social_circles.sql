-- ============================================================
-- 034: Social Circles — Granular Visibility & Trust System
-- Implements user-defined trust groups (Circles) used to
-- gate access to private events, check-ins, and reels.
-- ============================================================

-- 1. Tabella social_circles: i gruppi creati dall'utente
CREATE TABLE IF NOT EXISTS public.social_circles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 64),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circles_owner ON public.social_circles(owner_id);

-- 2. Tabella circle_members: appartenenze ai Circles (whitelist)
CREATE TABLE IF NOT EXISTS public.circle_members (
    circle_id UUID NOT NULL REFERENCES public.social_circles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (circle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_members_user ON public.circle_members(user_id);

-- 3. Estendi events con visibilità Circles (opzionale: null = no restriction)
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public'  -- 'public', 'circles', 'private'
    CHECK (visibility IN ('public','circles','private')),
    ADD COLUMN IF NOT EXISTS allowed_circle_id UUID REFERENCES public.social_circles(id) ON DELETE SET NULL;

-- 4. RLS — social_circles
ALTER TABLE public.social_circles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own circles"
    ON public.social_circles FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can view circles they belong to"
    ON public.social_circles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.circle_members cm
            WHERE cm.circle_id = social_circles.id
              AND cm.user_id = auth.uid()
        )
    );

-- 5. RLS — circle_members
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only circle owner manages members"
    ON public.circle_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.social_circles sc
            WHERE sc.id = circle_members.circle_id
              AND sc.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.social_circles sc
            WHERE sc.id = circle_members.circle_id
              AND sc.owner_id = auth.uid()
        )
    );

CREATE POLICY "Members can view themselves in a circle"
    ON public.circle_members FOR SELECT
    USING (auth.uid() = user_id);

-- 6. Funzione helper: può l'utente viewer vedere l'evento?
CREATE OR REPLACE FUNCTION public.can_view_event(
    p_viewer_id UUID,
    p_event_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_visibility TEXT;
    v_owner_id UUID;
    v_circle_id UUID;
BEGIN
    SELECT visibility, creator_id, allowed_circle_id
    INTO v_visibility, v_owner_id, v_circle_id
    FROM public.events
    WHERE id = p_event_id;

    -- Owner always has access
    IF v_owner_id = p_viewer_id THEN RETURN TRUE; END IF;

    CASE v_visibility
        WHEN 'public'  THEN RETURN TRUE;
        WHEN 'private' THEN RETURN FALSE;
        WHEN 'circles' THEN
            RETURN EXISTS (
                SELECT 1 FROM public.circle_members cm
                WHERE cm.circle_id = v_circle_id
                  AND cm.user_id = p_viewer_id
            );
        ELSE RETURN TRUE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. Aggiorna la RLS sugli eventi per usare can_view_event
-- Drop le policy select esistenti e ricrea con la nuova logica
DROP POLICY IF EXISTS "events_select" ON public.events;
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON public.events;

CREATE POLICY "Events visibility via circles"
    ON public.events FOR SELECT
    USING (public.can_view_event(auth.uid(), id));

-- 8. Trust Score: aggiunge una colonna al profilo per un punteggio calcolato
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS trust_score FLOAT DEFAULT 0.0;

-- 9. Funzione per ricalcolare il trust_score di un utente target
--    basato sulle interazioni bidirezionali (follows, likes, comments)
CREATE OR REPLACE FUNCTION public.recalculate_trust_score(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_score FLOAT;
BEGIN
    SELECT
        COALESCE(SUM(ua.affinity_score), 0) * 0.5 +
        (SELECT COUNT(*) FROM public.followers f
          WHERE f.following_id = p_user_id AND f.follower_id IN (
            SELECT following_id FROM public.followers WHERE follower_id = p_user_id
          )) * 2.0
    INTO v_score
    FROM public.user_affinities ua
    WHERE ua.target_id = p_user_id;

    UPDATE public.users SET trust_score = LEAST(v_score, 100.0) WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
