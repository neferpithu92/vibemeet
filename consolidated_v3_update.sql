-- Migration 048: Advanced Map Filtering
CREATE OR REPLACE FUNCTION get_venues_with_filters(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_meters DOUBLE PRECISION DEFAULT 5000,
  p_genres TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  location GEOGRAPHY(POINT, 4326),
  city TEXT,
  music_genres TEXT[],
  distance_meters DOUBLE PRECISION
)
LANGUAGE sql STABLE AS $$
  SELECT 
    v.id,
    v.name,
    v.location,
    v.city,
    v.music_genres,
    ST_Distance(v.location, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography) AS distance_meters
  FROM venues v
  WHERE 
    ST_DWithin(v.location, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography, p_radius_meters)
    AND (p_genres IS NULL OR v.music_genres && p_genres)
  ORDER BY distance_meters ASC;
$$;

-- Migration 049: FYP Algorithm Refinement
CREATE OR REPLACE FUNCTION get_fyp_algo_feed(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    author_id UUID,
    entity_type TEXT,
    entity_id UUID,
    type TEXT,
    url TEXT,
    thumbnail_url TEXT,
    caption TEXT,
    view_count INTEGER,
    like_count INTEGER,
    share_count INTEGER,
    comment_count INTEGER,
    created_at TIMESTAMPTZ,
    score DOUBLE PRECISION
) 
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH affinity AS (
        SELECT following_id, 2.0 as weight FROM followers WHERE follower_id = p_user_id AND entity_type = 'user'
        UNION ALL
        SELECT entity_id as following_id, 1.0 as weight FROM likes WHERE user_id = p_user_id AND entity_type = 'media'
    ),
    user_scores AS (
        SELECT following_id, SUM(weight) as total_weight FROM affinity GROUP BY following_id
    )
    SELECT 
        m.id, m.author_id, m.entity_type, m.entity_id, m.type, m.url, m.thumbnail_url,
        m.caption, m.view_count, m.like_count, m.share_count, m.comment_count, m.created_at,
        (
            COALESCE(us.total_weight, 0.5) * 10 + 
            m.like_count * 2 + 
            m.comment_count * 5 +
            EXTRACT(EPOCH FROM (m.created_at - '2024-01-01'::timestamp)) / 86400
        ) as score
    FROM media m
    LEFT JOIN user_scores us ON m.author_id = us.following_id
    WHERE m.expires_at IS NULL OR m.expires_at > NOW()
    ORDER BY score DESC
    LIMIT p_limit;
END;
$$;

-- Migration 050: Vibe Coins & Wallet System
CREATE TABLE IF NOT EXISTS public.point_transactions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount        INTEGER NOT NULL, -- positive for earn, negative for spend
    reason        TEXT NOT NULL, -- 'daily_checkin', 'post_boost', 'gift', etc.
    metadata      JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY pt_select_own ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.adjust_vibe_points(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT,
    p_metadata JSONB DEFAULT '{}'
) RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    IF p_amount < 0 THEN
        IF (SELECT vibe_points FROM users WHERE id = p_user_id) < ABS(p_amount) THEN
            RAISE EXCEPTION 'Saldo insufficiente';
        END IF;
    END IF;

    UPDATE public.users 
    SET vibe_points = vibe_points + p_amount 
    WHERE id = p_user_id
    RETURNING vibe_points INTO v_new_balance;

    INSERT INTO public.point_transactions (user_id, amount, reason, metadata)
    VALUES (p_user_id, p_amount, p_reason, p_metadata);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
