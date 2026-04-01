-- ============================================================
-- 018: Settings & Push Notifications
-- User settings preferences, push notification tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS user_settings (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- Privacy
  is_private      BOOLEAN DEFAULT FALSE,
  show_activity   BOOLEAN DEFAULT TRUE,
  allow_messages  TEXT DEFAULT 'everyone', -- 'everyone', 'friends', 'none'
  -- Notifications
  push_likes      BOOLEAN DEFAULT TRUE,
  push_comments   BOOLEAN DEFAULT TRUE,
  push_follows    BOOLEAN DEFAULT TRUE,
  push_messages   BOOLEAN DEFAULT TRUE,
  push_events     BOOLEAN DEFAULT TRUE,
  push_safety     BOOLEAN DEFAULT TRUE, -- Safe home alerts
  -- UI
  theme           TEXT DEFAULT 'dark',
  language        TEXT DEFAULT 'it',
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Push Tokens (Device Tokens for FCM / APNS / WebPush)
CREATE TABLE IF NOT EXISTS push_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token           TEXT NOT NULL,
  platform        TEXT NOT NULL, -- 'ios', 'android', 'web'
  device_id       TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_used_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id) WHERE is_active = TRUE;

-- Trigger to auto-create settings when user is created
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created_settings
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_settings();

-- Backfill existing users
INSERT INTO user_settings (user_id)
SELECT id FROM users
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY settings_select ON user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY settings_update ON user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY push_select ON push_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY push_insert ON push_tokens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY push_update ON push_tokens FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY push_delete ON push_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);
