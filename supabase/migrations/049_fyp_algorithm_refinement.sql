-- ============================================================
-- 049: FYP Algorithm Refinement
-- Updates get_fyp_algo_feed to match current schema (url, type, etc.)
-- and incorporates user_affinities for better ranking.
-- ============================================================

CREATE OR REPLACE FUNCTION get_fyp_algo_feed(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_type TEXT DEFAULT NULL -- 'photo' or 'video'
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
  author_display_name TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  location_name TEXT,
  created_at TIMESTAMPTZ,
  algo_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id, 
    m.type, 
    m.url, 
    m.thumbnail_url, 
    m.caption,
    u.id as author_id, 
    u.username as author_username, 
    u.avatar_url as author_avatar,
    u.display_name as author_display_name,
    m.like_count, 
    m.comment_count,
    m.location_name,
    m.created_at,
    (
      (
        COALESCE(m.like_count, 0) * 5.0 + 
        COALESCE(m.comment_count, 0) * 10.0 + 
        COALESCE(aff.affinity_score, 0) * 20.0 +
        100.0
      ) 
      / 
      POWER(EXTRACT(EPOCH FROM (NOW() - m.created_at))/3600 + 2, 1.8)
    )::DECIMAL as algo_score
  FROM public.media m
  JOIN public.users u ON u.id = m.author_id
  LEFT JOIN public.user_affinities aff ON aff.entity_id = m.author_id::TEXT AND aff.user_id = p_user_id
  WHERE (p_type IS NULL OR m.type = p_type)
    AND m.created_at > NOW() - INTERVAL '30 days'
    AND (p_user_id IS NULL OR (
        public.can_view_media(p_user_id, m.id)
        -- Don't filter out viewed ones in this version to allow re-watching but we could add ui.interaction check back
    ))
  ORDER BY algo_score DESC, m.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
