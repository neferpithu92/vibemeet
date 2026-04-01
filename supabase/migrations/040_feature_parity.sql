-- ============================================================
-- 040: Feature Parity & Extended Social Components
-- Usage tracking, cross-posting, close friends, and story privacy
-- ============================================================

-- 1. Usage Stats & Limits
CREATE TABLE IF NOT EXISTS usage_stats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE DEFAULT CURRENT_DATE,
    total_seconds   INTEGER DEFAULT 0,
    daily_limit     INTEGER DEFAULT NULL, -- NULL means no limit
    UNIQUE(user_id, date)
);

-- 2. Cross-Posting Settings
CREATE TABLE IF NOT EXISTS cross_posting_settings (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    instagram_linked BOOLEAN DEFAULT FALSE,
    facebook_linked  BOOLEAN DEFAULT FALSE,
    tiktok_linked    BOOLEAN DEFAULT FALSE,
    auto_share       BOOLEAN DEFAULT FALSE,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Close Friends (Social Circles Subset)
CREATE TABLE IF NOT EXISTS close_friends (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, friend_id)
);

-- 4. Story & Interaction Settings
CREATE TABLE IF NOT EXISTS story_settings (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    allow_replies   TEXT DEFAULT 'everyone', -- 'everyone', 'friends', 'none'
    allow_live_comments BOOLEAN DEFAULT TRUE,
    location_sharing_enabled BOOLEAN DEFAULT TRUE,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Saved & Archived Items
CREATE TABLE IF NOT EXISTS saved_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type       TEXT NOT NULL, -- 'post', 'story', 'venue'
    item_id         UUID NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
);

CREATE TABLE IF NOT EXISTS archived_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type       TEXT NOT NULL,
    item_id         UUID NOT NULL,
    original_data   JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Activity Log (Non-repudiation)
CREATE TABLE IF NOT EXISTS activity_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action          TEXT NOT NULL, -- 'login', 'upload', 'delete', 'change_password'
    metadata        JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Configuration
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_posting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Owner-only access)
CREATE POLICY usage_owner ON usage_stats FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY cross_owner ON cross_posting_settings FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY close_owner ON close_friends FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY story_owner ON story_settings FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY saved_owner ON saved_items FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY archived_owner ON archived_items FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY log_owner ON activity_log FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Auto-initializer for new users
CREATE OR REPLACE FUNCTION initialize_user_extensions()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO cross_posting_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO story_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created_extensions
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_extensions();

-- Backfill
INSERT INTO cross_posting_settings (user_id) SELECT id FROM users ON CONFLICT DO NOTHING;
INSERT INTO story_settings (user_id) SELECT id FROM users ON CONFLICT DO NOTHING;

-- RPC for incrementing stats atomically
CREATE OR REPLACE FUNCTION increment_usage(p_user_id UUID, p_date DATE, p_seconds INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_stats (user_id, date, total_seconds)
  VALUES (p_user_id, p_date, p_seconds)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET total_seconds = usage_stats.total_seconds + p_seconds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
