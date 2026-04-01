-- ============================================================
-- 035: Social Circles Extended & Trust Triggers
-- Extends Social Circles to Media and automates Trust Scores.
-- ============================================================

-- 1. Estendi media con visibilità Circles
ALTER TABLE public.media
    ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public'
    CHECK (visibility IN ('public','circles','friends','private')),
    ADD COLUMN IF NOT EXISTS allowed_circle_id UUID REFERENCES public.social_circles(id) ON DELETE SET NULL;

-- 2. Funzione helper: può l'utente viewer vedere il contenuto media?
CREATE OR REPLACE FUNCTION public.can_view_media(
    p_viewer_id UUID,
    p_media_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_visibility TEXT;
    v_owner_id UUID;
    v_circle_id UUID;
BEGIN
    SELECT visibility, user_id, allowed_circle_id
    INTO v_visibility, v_owner_id, v_circle_id
    FROM public.media
    WHERE id = p_media_id;

    -- Owner always has access
    IF v_owner_id = p_viewer_id THEN RETURN TRUE; END IF;

    CASE v_visibility
        WHEN 'public'  THEN RETURN TRUE;
        WHEN 'private' THEN RETURN FALSE;
        WHEN 'friends' THEN
            -- Check mutual follow
            RETURN EXISTS (
                SELECT 1 FROM public.followers f1
                JOIN public.followers f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
                WHERE f1.follower_id = v_owner_id AND f1.following_id = p_viewer_id
            );
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

-- 3. Aggiorna RLS su media
DROP POLICY IF EXISTS media_select ON public.media;
CREATE POLICY media_select ON public.media FOR SELECT 
USING (public.can_view_media(auth.uid(), id));

-- 4. Trigger per ricalcolare Trust Score quando cambiano i followers
CREATE OR REPLACE FUNCTION public.after_follower_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.recalculate_trust_score(NEW.following_id);
    ELSIF (TG_OP = 'DELETE') THEN
        PERFORM public.recalculate_trust_score(OLD.following_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_recalculate_trust_on_follow ON public.followers;
CREATE TRIGGER tr_recalculate_trust_on_follow
AFTER INSERT OR DELETE ON public.followers
FOR EACH ROW EXECUTE FUNCTION public.after_follower_change();

-- 5. Funzione per aggiornare user_affinities basato su interazioni
--    Viene chiamata dai trigger su likes e comments (e batch API)
CREATE OR REPLACE FUNCTION public.update_user_affinity(
    p_user_id UUID,
    p_target_id UUID,
    p_increment DECIMAL
) RETURNS VOID AS $$
BEGIN
    IF p_user_id = p_target_id THEN RETURN; END IF;

    INSERT INTO public.user_affinities (user_id, entity_type, entity_id, affinity_score)
    VALUES (p_user_id, 'author', p_target_id::TEXT, p_increment)
    ON CONFLICT (user_id, entity_type, entity_id)
    DO UPDATE SET 
        affinity_score = public.user_affinities.affinity_score + p_increment,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger su Likes per aggiornare Affinity e Contatori
CREATE OR REPLACE FUNCTION public.after_like_aff_and_count()
RETURNS TRIGGER AS $$
DECLARE
    v_author_id UUID;
BEGIN
    -- 6.1 Determina l'autore del contenuto likato e aggiorna count
    IF (NEW.entity_type = 'media') THEN
        SELECT user_id INTO v_author_id FROM public.media WHERE id = NEW.entity_id;
        UPDATE public.media SET like_count = like_count + 1 WHERE id = NEW.entity_id;
    ELSIF (NEW.entity_type = 'event') THEN
        SELECT creator_id INTO v_author_id FROM public.events WHERE id = NEW.entity_id;
    END IF;

    -- 6.2 Incrementa Affinità (Like = +2.0)
    IF v_author_id IS NOT NULL THEN
        PERFORM public.update_user_affinity(NEW.user_id, v_author_id, 2.0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_like_aff_and_count ON public.likes;
CREATE TRIGGER tr_like_aff_and_count
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.after_like_aff_and_count();

-- 7. Trigger su User Affinities per ricalcolare Trust Score
--    Quando l'affinità di qualcuno verso di me cambia, il mio trust score può cambiare
CREATE OR REPLACE FUNCTION public.after_affinity_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.entity_type = 'author') THEN
        PERFORM public.recalculate_trust_score(NEW.entity_id::UUID);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_recalculate_trust_on_affinity ON public.user_affinities;
CREATE TRIGGER tr_recalculate_trust_on_affinity
AFTER INSERT OR UPDATE ON public.user_affinities
FOR EACH ROW EXECUTE FUNCTION public.after_affinity_change();

-- 8. Aggiorna get_fyp_algo_feed per rispettare la visibilità
CREATE OR REPLACE FUNCTION get_fyp_algo_feed(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, 
  type TEXT, 
  url TEXT, 
  thumbnail_url TEXT, 
  caption TEXT,
  author_id UUID,
  author_username TEXT,
  author_avatar TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  audio_title TEXT,
  location_name TEXT,
  algo_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id, m.media_type as type, m.media_url as url, m.thumbnail_url, m.caption,
    u.id as author_id, u.username as author_username, u.avatar_url as author_avatar,
    m.like_count, m.comment_count,
    a.title as audio_title,
    m.location_name,
    (
      (COALESCE(m.like_count, 0) * 2.0 + COALESCE(m.comment_count, 0) * 3.0 + 10.0) 
      / 
      POWER(EXTRACT(EPOCH FROM (NOW() - m.created_at))/3600 + 2, 1.5)
    )::DECIMAL as algo_score
  FROM media m
  JOIN users u ON u.id = m.user_id
  LEFT JOIN audio_tracks a ON a.id = m.audio_track_id
  WHERE m.media_type IN ('video', 'reel') 
    AND m.created_at > NOW() - INTERVAL '14 days'
    AND (p_user_id IS NULL OR (
        public.can_view_media(p_user_id, m.id)
        AND NOT EXISTS (
          SELECT 1 FROM user_interactions ui 
          WHERE ui.id IS NOT NULL AND ui.user_id = p_user_id AND ui.post_id = m.id AND ui.interaction_type = 'view'
        )
    ))
  ORDER BY algo_score DESC, m.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 9. RPC: process_batch_interactions
--     Gestisce invii multipli di 'view' e incrementi 'affinity' in un'unica transazione.
CREATE OR REPLACE FUNCTION public.process_batch_interactions(p_interactions JSONB)
RETURNS VOID AS $$
DECLARE
    v_item JSONB;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_interactions)
    LOOP
        -- Inserisce l'interazione bruta
        INSERT INTO public.user_interactions (user_id, post_id, interaction_type, watch_time_sec)
        VALUES (
            (v_item->>'user_id')::UUID,
            (v_item->>'post_id')::UUID,
            v_item->>'type',
            COALESCE((v_item->>'watch_time')::INTEGER, 0)
        );

        -- Aggiorna Affinity (se è una view o una lunga visione)
        IF (v_item->>'type' = 'view') THEN
            PERFORM public.update_user_affinity(
                (v_item->>'user_id')::UUID,
                (v_item->>'author_id')::UUID,
                COALESCE((v_item->>'affinity_inc')::DECIMAL, 0.1)
            );
            
            -- Incrementa view_count su media
            UPDATE public.media SET view_count = view_count + 1 WHERE id = (v_item->>'post_id')::UUID;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
