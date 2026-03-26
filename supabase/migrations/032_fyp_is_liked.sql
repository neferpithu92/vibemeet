-- ============================================================
-- 032: FYP Algorithm Enhancement - is_liked status
-- ============================================================

DROP FUNCTION IF EXISTS get_fyp_algo_feed;

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
  algo_score DECIMAL,
  is_liked BOOLEAN -- NEW: Traccia se l'utente attuale ha messo like
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id, m.type, m.url, m.thumbnail_url, m.caption,
    u.id as author_id, u.username as author_username, u.avatar_url as author_avatar,
    m.like_count, m.comment_count,
    a.title as audio_title,
    m.location_name,
    -- Scoring logic remains same
    (
      (COALESCE(m.like_count, 0) * 2.0 + COALESCE(m.comment_count, 0) * 3.0 + 10.0) 
      / 
      POWER(EXTRACT(EPOCH FROM (NOW() - m.created_at))/3600 + 2, 1.5)
    )::DECIMAL as algo_score,
    -- Check if user liked it
    EXISTS (
      SELECT 1 FROM likes l 
      WHERE l.entity_id = m.id AND l.user_id = p_user_id
    ) as is_liked
  FROM media m
  JOIN users u ON u.id = m.author_id
  LEFT JOIN audio_tracks a ON a.id = m.audio_track_id
  WHERE m.type IN ('video', 'reel', 'image') -- Permettiamo anche immagini se richiesto, ma filtriamo nel client reels
    AND m.created_at > NOW() - INTERVAL '30 days' -- Estendiamo a 30gg per feed più ricchi
    AND (p_user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM user_interactions ui 
      WHERE ui.user_id = p_user_id AND ui.post_id = m.id AND ui.interaction_type = 'view'
    ))
  ORDER BY algo_score DESC, m.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
