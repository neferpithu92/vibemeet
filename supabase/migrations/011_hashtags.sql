-- ============================================================
-- 011: Hashtag System
-- Hashtags, post linkage, trending, auto-count triggers
-- ============================================================

-- Core hashtags table
CREATE TABLE IF NOT EXISTS hashtags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag             TEXT NOT NULL UNIQUE, -- lowercase, no '#'
  post_count      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hashtags_tag ON hashtags(tag);
CREATE INDEX idx_hashtags_post_count ON hashtags(post_count DESC);

-- Many-to-many: posts <-> hashtags
CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id         UUID NOT NULL,
  post_type       TEXT NOT NULL, -- 'media' | 'event' | 'story' | 'vibe'
  hashtag_id      UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, post_type, hashtag_id)
);

CREATE INDEX idx_post_hashtags_hashtag ON post_hashtags(hashtag_id);
CREATE INDEX idx_post_hashtags_post ON post_hashtags(post_id, post_type);

-- Trending hashtags per city (computed periodically)
CREATE TABLE IF NOT EXISTS trending_hashtags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hashtag_id      UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  city            TEXT NOT NULL, -- 'zurich' | 'geneva' | 'basel' | 'global'
  score           DECIMAL NOT NULL DEFAULT 0,
  period          TEXT DEFAULT '24h', -- '1h' | '24h' | '7d'
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trending_city_period ON trending_hashtags(city, period, score DESC);

-- Trigger: auto-update post_count on insert/delete
CREATE OR REPLACE FUNCTION update_hashtag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hashtags SET post_count = post_count + 1 WHERE id = NEW.hashtag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hashtags SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.hashtag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hashtag_count_trigger
  AFTER INSERT OR DELETE ON post_hashtags
  FOR EACH ROW EXECUTE FUNCTION update_hashtag_count();

-- RLS
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY hashtags_select ON hashtags FOR SELECT TO authenticated USING (true);
CREATE POLICY hashtags_insert ON hashtags FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY post_hashtags_select ON post_hashtags FOR SELECT TO authenticated USING (true);
CREATE POLICY post_hashtags_insert ON post_hashtags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY post_hashtags_delete ON post_hashtags FOR DELETE TO authenticated USING (true);

ALTER TABLE trending_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY trending_select ON trending_hashtags FOR SELECT TO authenticated USING (true);
