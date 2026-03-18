-- ============================================================
-- 016: For You Page Algorithm
-- Interactions tracking, user affinities, algorithm scoring
-- ============================================================

CREATE TABLE IF NOT EXISTS user_interactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id         UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'view', 'like', 'comment', 'share', 'save'
  watch_time_sec  INTEGER DEFAULT 0, -- Rilevante per i video
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions_user ON user_interactions(user_id, interaction_type);
CREATE INDEX idx_interactions_post ON user_interactions(post_id);

-- Tabella per l'affinita dell'utente verso categorie/hashtag/autori
CREATE TABLE IF NOT EXISTS user_affinities (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL, -- 'category', 'hashtag', 'author'
  entity_id       TEXT NOT NULL, -- ID della categoria, dell'hashtag o dell'autore
  affinity_score  DECIMAL DEFAULT 1.0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);

-- Funzione core per la For You Page (Versione semplificata per Phase 16)
-- Calcola un rank score basato su popolarità e (se l'utente è loggato) freschezza
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
    m.id, m.type, m.url, m.thumbnail_url, m.caption,
    u.id as author_id, u.username as author_username, u.avatar_url as author_avatar,
    m.like_count, m.comment_count,
    a.title as audio_title,
    m.location_name,
    -- Simple Scoring Math: (Likes * 2 + Comments * 3) / POW(Hours_Since_Post + 2, 1.5)
    (
      (COALESCE(m.like_count, 0) * 2.0 + COALESCE(m.comment_count, 0) * 3.0 + 10.0) 
      / 
      POWER(EXTRACT(EPOCH FROM (NOW() - m.created_at))/3600 + 2, 1.5)
    )::DECIMAL as algo_score
  FROM media m
  JOIN users u ON u.id = m.author_id
  LEFT JOIN audio_tracks a ON a.id = m.audio_track_id
  WHERE m.type IN ('video', 'reel') -- Solo contenuti video verticali per la FYP
    AND m.created_at > NOW() - INTERVAL '14 days' -- Contenuti relativamente freschi
    -- Se p_user_id c'è, escludere post già visti (in una vera app)
    AND (p_user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM user_interactions ui 
      WHERE ui.user_id = p_user_id AND ui.post_id = m.id AND ui.interaction_type = 'view'
      -- Nota: In produzione spesso non si escludono ma si penalizzano sul feed
    ))
  ORDER BY algo_score DESC, m.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
