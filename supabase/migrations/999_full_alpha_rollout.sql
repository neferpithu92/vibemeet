-- ============================================================
-- 999: FULL ANTIGRAVITY ALPHA ROLLOUT
-- Consolidates Migrations 035, 036, 037, 038, 041
-- Targeted for: High-Throughput Social Infrastructure & User Lifecycle
-- ============================================================

BEGIN;

-- 1. SOCIAL CIRCLES & VISIBILITY (Migration 035)
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS allowed_circle_id UUID REFERENCES public.social_circles(id) ON DELETE SET NULL;
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION public.can_view_media(viewer_id UUID, media_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_visibility TEXT;
    v_circle_id UUID;
    v_owner_id UUID;
BEGIN
    SELECT visibility, allowed_circle_id, user_id INTO v_visibility, v_circle_id, v_owner_id
    FROM public.media WHERE id = media_id;
    
    IF v_owner_id = viewer_id THEN RETURN TRUE; END IF;
    IF v_visibility = 'public' THEN RETURN TRUE; END IF;
    IF v_visibility = 'private' THEN RETURN FALSE; END IF;
    
    IF v_visibility = 'friends' THEN
        RETURN EXISTS (SELECT 1 FROM public.followers WHERE follower_id = v_owner_id AND following_id = viewer_id);
    END IF;
    
    IF v_visibility = 'circles' THEN
        RETURN EXISTS (SELECT 1 FROM public.circle_members WHERE circle_id = v_circle_id AND user_id = viewer_id);
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. COUNTER SHARDING INFRASTRUCTURE (Migration 036/038 Refactored)
CREATE TABLE IF NOT EXISTS public.entity_counters_shards (
    entity_id     UUID NOT NULL,
    entity_type   TEXT NOT NULL,
    shard_index   INTEGER NOT NULL,
    likes_count   INTEGER DEFAULT 0,
    views_count   INTEGER DEFAULT 0,
    PRIMARY KEY (entity_id, entity_type, shard_index)
);

CREATE INDEX IF NOT EXISTS idx_counter_shards_entity_v2 ON public.entity_counters_shards(entity_id, entity_type);

CREATE OR REPLACE FUNCTION public.increment_sharded_counter_v2(
    p_entity_id UUID,
    p_entity_type TEXT,
    p_likes_inc INTEGER DEFAULT 0,
    p_views_inc INTEGER DEFAULT 0
) RETURNS VOID AS $$
DECLARE
    v_shard_index INTEGER;
BEGIN
    v_shard_index := floor(random() * 10)::INTEGER;
    INSERT INTO public.entity_counters_shards (entity_id, entity_type, shard_index, likes_count, views_count)
    VALUES (p_entity_id, p_entity_type, v_shard_index, p_likes_inc, p_views_inc)
    ON CONFLICT (entity_id, entity_type, shard_index)
    DO UPDATE SET 
        likes_count = public.entity_counters_shards.likes_count + p_likes_inc,
        views_count = public.entity_counters_shards.views_count + p_views_inc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. SOCIAL TRIGGERS & AFFINITY
CREATE OR REPLACE FUNCTION public.after_like_aff_and_count()
RETURNS TRIGGER AS $$
DECLARE
    v_author_id UUID;
BEGIN
    IF (NEW.entity_type = 'media') THEN
        SELECT user_id INTO v_author_id FROM public.media WHERE id = NEW.entity_id;
        PERFORM public.increment_sharded_counter_v2(NEW.entity_id, 'media', 1, 0);
    ELSIF (NEW.entity_type = 'event') THEN
        SELECT creator_id INTO v_author_id FROM public.events WHERE id = NEW.entity_id;
        PERFORM public.increment_sharded_counter_v2(NEW.entity_id, 'event', 1, 0);
    END IF;
    IF v_author_id IS NOT NULL THEN
        PERFORM public.update_user_affinity(NEW.user_id, v_author_id, 2.0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.process_batch_interactions(p_interactions JSONB)
RETURNS VOID AS $$
DECLARE
    v_item JSONB;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_interactions)
    LOOP
        INSERT INTO public.user_interactions (user_id, post_id, interaction_type, watch_time_sec)
        VALUES (
            (v_item->>'user_id')::UUID,
            (v_item->>'post_id')::UUID,
            v_item->>'type',
            COALESCE((v_item->>'watch_time')::INTEGER, 0)
        );
        IF (v_item->>'type' = 'view') THEN
            PERFORM public.update_user_affinity(
                (v_item->>'user_id')::UUID,
                (v_item->>'author_id')::UUID,
                COALESCE((v_item->>'affinity_inc')::DECIMAL, 0.1)
            );
            PERFORM public.increment_sharded_counter_v2((v_item->>'post_id')::UUID, 'media', 0, 1);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ATOMIC DELTA-BUFFER SYNC (Migration 038)
CREATE OR REPLACE FUNCTION public.sync_sharded_counters_v2()
RETURNS VOID AS $$
DECLARE
    row RECORD;
BEGIN
    FOR row IN 
        WITH deleted_shards AS (
            DELETE FROM public.entity_counters_shards
            WHERE true
            RETURNING entity_id, entity_type, likes_count, views_count
        )
        SELECT 
            entity_id, 
            entity_type, 
            SUM(likes_count) as total_likes, 
            SUM(views_count) as total_views
        FROM deleted_shards
        GROUP BY entity_id, entity_type
    LOOP
        IF row.entity_type = 'media' THEN
            UPDATE public.media 
            SET 
                like_count = public.media.like_count + row.total_likes,
                view_count = public.media.view_count + row.total_views,
                updated_at = now()
            WHERE id = row.entity_id;
        ELSIF row.entity_type = 'event' THEN
            UPDATE public.events 
            SET 
                view_count = public.events.view_count + row.total_views,
                updated_at = now()
            WHERE id = row.entity_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. PG_CRON AUTOMATION (Migration 037)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('sync-sharded-counters-every-min');
SELECT cron.unschedule('sync-counters-high-freq');

SELECT cron.schedule(
    'sync-counters-high-freq', 
    '10 seconds', 
    'SELECT public.sync_sharded_counters_v2()'
);

-- 7. SETTINGS & USER LIFECYCLE (Migration 041)
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  account_type TEXT DEFAULT 'public',
  who_can_message TEXT DEFAULT 'everyone',
  who_can_tag TEXT DEFAULT 'everyone',
  who_can_see_posts TEXT DEFAULT 'everyone',
  show_activity_status BOOLEAN DEFAULT true,
  show_on_map BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS public.blocked_users (
  blocker_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.close_friends (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS public.saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.media(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.archived_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.media(id) ON DELETE CASCADE,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.story_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  allow_replies BOOLEAN DEFAULT true,
  allow_reshare BOOLEAN DEFAULT true,
  show_location BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'it';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

-- 8. SECURITY - RLS
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_privacy" ON public.privacy_settings;
CREATE POLICY "own_privacy" ON public.privacy_settings FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_notifications" ON public.notification_settings;
CREATE POLICY "own_notifications" ON public.notification_settings FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_blocked" ON public.blocked_users;
CREATE POLICY "own_blocked" ON public.blocked_users FOR ALL USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "own_friends" ON public.close_friends;
CREATE POLICY "own_friends" ON public.close_friends FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_saved" ON public.saved_items;
CREATE POLICY "own_saved" ON public.saved_items FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_archived" ON public.archived_posts;
CREATE POLICY "own_archived" ON public.archived_posts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_story_settings" ON public.story_settings;
CREATE POLICY "own_story_settings" ON public.story_settings FOR ALL USING (auth.uid() = user_id);

-- 9. TRIGGERS & INITIALIZERS
CREATE OR REPLACE FUNCTION public.create_user_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.privacy_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.notification_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.story_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created_default_settings ON public.users;
CREATE TRIGGER on_user_created_default_settings
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_default_settings();

-- 10. OAUTH & DUPLICATE PREVENTION FIX
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

COMMIT;
