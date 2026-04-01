-- Block 2 & 5: Database Migrations for Settings and OAuth Fix

-- 1. Privacy Settings
CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  account_type TEXT DEFAULT 'public',
  who_can_message TEXT DEFAULT 'everyone',
  who_can_tag TEXT DEFAULT 'everyone',
  who_can_see_posts TEXT DEFAULT 'everyone',
  show_activity_status BOOLEAN DEFAULT true,
  show_on_map BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Notification Settings
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  likes BOOLEAN DEFAULT true,
  comments BOOLEAN DEFAULT true,
  follows BOOLEAN DEFAULT true,
  messages BOOLEAN DEFAULT true,
  events BOOLEAN DEFAULT true,
  safety_alerts BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Blocked Users
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- 4. Close Friends
CREATE TABLE IF NOT EXISTS close_friends (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

-- 5. Saved Items
CREATE TABLE IF NOT EXISTS saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES media(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- 6. Archived Posts
CREATE TABLE IF NOT EXISTS archived_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES media(id) ON DELETE CASCADE,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- 7. Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id PRIMARY KEY UUID DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Usage Stats
CREATE TABLE IF NOT EXISTS usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes_used INTEGER DEFAULT 0,
  daily_limit_minutes INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- 9. Story Settings
CREATE TABLE IF NOT EXISTS story_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  allow_replies BOOLEAN DEFAULT true,
  allow_reshare BOOLEAN DEFAULT true,
  show_location BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Users Table Extensions
ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'it';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- 11. Security - RLS
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_settings ENABLE ROW LEVEL SECURITY;

-- 12. Policies
DROP POLICY IF EXISTS "own_privacy" ON privacy_settings;
CREATE POLICY "own_privacy" ON privacy_settings FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_notifications" ON notification_settings;
CREATE POLICY "own_notifications" ON notification_settings FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_blocked" ON blocked_users;
CREATE POLICY "own_blocked" ON blocked_users FOR ALL USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "own_friends" ON close_friends;
CREATE POLICY "own_friends" ON close_friends FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_saved" ON saved_items;
CREATE POLICY "own_saved" ON saved_items FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_archived" ON archived_posts;
CREATE POLICY "own_archived" ON archived_posts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_activity" ON activity_log;
CREATE POLICY "own_activity" ON activity_log FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_usage" ON usage_stats;
CREATE POLICY "own_usage" ON usage_stats FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_story_settings" ON story_settings;
CREATE POLICY "own_story_settings" ON story_settings FOR ALL USING (auth.uid() = user_id);

-- 13. Auto-initializer
CREATE OR REPLACE FUNCTION create_user_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO privacy_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO notification_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO story_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created_default_settings ON users;
CREATE TRIGGER on_user_created_default_settings
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_default_settings();

-- 14. OAuth Fix (from Block 5)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_avatar_url TEXT;
  counter INTEGER := 0;
  base_username TEXT;
BEGIN
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );
  base_username := LOWER(REGEXP_REPLACE(
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    '[^a-z0-9_]', '_', 'g'
  ));
  v_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = v_username) LOOP
    counter := counter + 1;
    v_username := base_username || '_' || counter;
  END LOOP;
  INSERT INTO public.users (id, email, username, display_name, avatar_url)
  VALUES (NEW.id, NEW.email, v_username, v_display_name, v_avatar_url)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(public.users.display_name, EXCLUDED.display_name),
    avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
