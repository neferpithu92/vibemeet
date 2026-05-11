-- ============================================================
-- VibeMeet v5 — Database Fixes Migration
-- Eseguire nel SQL Editor di Supabase Dashboard
-- ============================================================

-- 1. Assicurarsi che notifications abbia le colonne necessarie
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'system';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 2. Assicurarsi che media abbia like_count e comment_count
ALTER TABLE media ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE media ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
ALTER TABLE media ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE media ADD COLUMN IF NOT EXISTS filter_applied TEXT;

-- 3. Assicurarsi che saved_posts esista
CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- 4. Assicurarsi che followers accetti insert (non solo upsert)
-- Aggiunge un indice se non esiste
CREATE UNIQUE INDEX IF NOT EXISTS followers_composite_unique 
ON followers(follower_id, following_id, entity_type);

-- 5. RLS policies per saved_posts
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_posts_select" ON saved_posts;
CREATE POLICY "saved_posts_select" ON saved_posts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_posts_insert" ON saved_posts;
CREATE POLICY "saved_posts_insert" ON saved_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_posts_delete" ON saved_posts;
CREATE POLICY "saved_posts_delete" ON saved_posts
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Aggiorna RLS per notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (true); -- Permette insert dal server

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 7. RLS per media
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_select_public" ON media;
CREATE POLICY "media_select_public" ON media
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "media_insert" ON media;
CREATE POLICY "media_insert" ON media
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "media_update" ON media;
CREATE POLICY "media_update" ON media
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "media_delete" ON media;
CREATE POLICY "media_delete" ON media
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Storage bucket policies (Assicura che 'media' e 'stories' siano pubblici)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('media', 'media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'image/gif']),
  ('stories', 'stories', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- 9. Storage policy per media bucket
DROP POLICY IF EXISTS "media_storage_upload" ON storage.objects;
CREATE POLICY "media_storage_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "media_storage_select" ON storage.objects;
CREATE POLICY "media_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

-- 10. Storage policy per stories bucket
DROP POLICY IF EXISTS "stories_storage_upload" ON storage.objects;
CREATE POLICY "stories_storage_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "stories_storage_select" ON storage.objects;
CREATE POLICY "stories_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'stories');

-- 11. Funzione FYP se non esiste (fallback sicuro)
CREATE OR REPLACE FUNCTION get_fyp_algo_feed(
  p_user_id UUID,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_type TEXT DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  media_url TEXT,
  media_type TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ,
  like_count INT,
  comment_count INT,
  view_count INT,
  user_id UUID,
  author_username TEXT,
  author_display_name TEXT,
  author_avatar TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.media_url,
    m.media_type,
    m.caption,
    m.created_at,
    COALESCE(m.like_count, 0),
    COALESCE(m.comment_count, 0),
    COALESCE(m.view_count, 0),
    m.user_id,
    u.username,
    u.display_name,
    u.avatar_url
  FROM media m
  JOIN users u ON u.id = m.user_id
  WHERE 
    m.visibility = 'public'
    AND (p_type IS NULL OR m.media_type = p_type)
  ORDER BY 
    (COALESCE(m.like_count, 0) * 3 + COALESCE(m.comment_count, 0) * 5 + COALESCE(m.view_count, 0)) DESC,
    m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Indici per performance
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_visibility ON media(visibility);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_likes_entity ON likes(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

-- 13. Trigger per aggiornare followers_count nella tabella users
CREATE OR REPLACE FUNCTION update_follower_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.entity_type = 'user' THEN
    -- Aggiorna follower count del target
    UPDATE users SET followers_count = COALESCE(followers_count, 0) + 1 
    WHERE id = NEW.following_id;
    -- Aggiorna following count del follower
    UPDATE users SET following_count = COALESCE(following_count, 0) + 1 
    WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' AND OLD.entity_type = 'user' THEN
    UPDATE users SET followers_count = GREATEST(0, COALESCE(followers_count, 0) - 1) 
    WHERE id = OLD.following_id;
    UPDATE users SET following_count = GREATEST(0, COALESCE(following_count, 0) - 1) 
    WHERE id = OLD.follower_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_follow_change ON followers;
CREATE TRIGGER on_follow_change
  AFTER INSERT OR DELETE ON followers
  FOR EACH ROW EXECUTE FUNCTION update_follower_counts();

-- Aggiunge colonne followers_count e following_count alla tabella users se mancano
ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- 14. Riconcilia i contatori esistenti
UPDATE users u SET 
  followers_count = (SELECT COUNT(*) FROM followers f WHERE f.following_id = u.id AND f.entity_type = 'user'),
  following_count = (SELECT COUNT(*) FROM followers f WHERE f.follower_id = u.id AND f.entity_type = 'user');

SELECT 'Migration VibeMeet v5 completata con successo!' AS status;
