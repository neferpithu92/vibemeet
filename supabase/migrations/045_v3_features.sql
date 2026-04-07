-- =============================================================
-- Migration 045: V3 Features — Stories, Messages, Gamification,
--                Safety, Artists, Live Streams, Badges
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. STORIES SYSTEM
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url     TEXT,
  type          TEXT NOT NULL DEFAULT 'photo' CHECK (type IN ('photo','video','text')),
  text_content  TEXT,
  text_color    TEXT DEFAULT '#FFFFFF',
  bg_color      TEXT DEFAULT '#7C3AED',
  duration      INTEGER DEFAULT 5,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS story_views (
  story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS story_highlights (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  cover_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS highlight_stories (
  highlight_id UUID NOT NULL REFERENCES story_highlights(id) ON DELETE CASCADE,
  story_id     UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (highlight_id, story_id)
);

-- RLS
ALTER TABLE stories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views     ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories_select" ON stories FOR SELECT USING (true);
CREATE POLICY "stories_insert" ON stories FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "stories_delete" ON stories FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "story_views_insert" ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);
CREATE POLICY "story_views_select" ON story_views FOR SELECT USING (true);

CREATE POLICY "highlights_all" ON story_highlights FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "highlights_select" ON story_highlights FOR SELECT USING (true);

CREATE POLICY "highlight_stories_all" ON highlight_stories FOR ALL USING (true);

-- ─────────────────────────────────────────────────────────────
-- 2. DIRECT MESSAGES / CONVERSATIONS
--    (tables may already exist from 033; create IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_message_at       TIMESTAMPTZ DEFAULT now(),
  last_message_preview  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unread_count      INTEGER NOT NULL DEFAULT 0,
  is_muted          BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content          TEXT,
  type             TEXT NOT NULL DEFAULT 'text',
  media_url        TEXT,
  reply_to_id      UUID REFERENCES messages(id) ON DELETE SET NULL,
  read_by          UUID[] NOT NULL DEFAULT '{}',
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for conversations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversations' AND policyname='conv_member') THEN
    ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "conv_member" ON conversations FOR ALL USING (
      EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = conversations.id AND user_id = auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_members' AND policyname='cm_self') THEN
    ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "cm_self" ON conversation_members FOR ALL USING (user_id = auth.uid());
    CREATE POLICY "cm_conv" ON conversation_members FOR SELECT USING (
      EXISTS (SELECT 1 FROM conversation_members cm2 WHERE cm2.conversation_id = conversation_id AND cm2.user_id = auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='msg_member') THEN
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "msg_member" ON messages FOR ALL USING (
      EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
    );
  END IF;
END $$;

-- Enable realtime on messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ─────────────────────────────────────────────────────────────
-- 3. GAMIFICATION — Badges & Vibe Points
-- ─────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS vibe_points INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS user_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id   TEXT NOT NULL,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS weekly_challenges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  points       INTEGER NOT NULL DEFAULT 50,
  target_type  TEXT NOT NULL, -- 'check_ins', 'posts', 'follows', etc.
  target_count INTEGER NOT NULL DEFAULT 5,
  starts_at    TIMESTAMPTZ NOT NULL DEFAULT date_trunc('week', now()),
  ends_at      TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('week', now()) + interval '7 days'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_participations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id   UUID NOT NULL REFERENCES weekly_challenges(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress       INTEGER NOT NULL DEFAULT 0,
  completed      BOOLEAN NOT NULL DEFAULT false,
  completed_at   TIMESTAMPTZ,
  UNIQUE (challenge_id, user_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_select" ON user_badges FOR SELECT USING (true);
CREATE POLICY "badges_insert" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges_select" ON weekly_challenges FOR SELECT USING (true);

ALTER TABLE challenge_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_all" ON challenge_participations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "cp_select" ON challenge_participations FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────
-- 4. SAFETY — Trusted Contacts (may exist from 014)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trusted_contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, contact_user_id),
  CHECK (user_id != contact_user_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='trusted_contacts' AND policyname='tc_owner') THEN
    ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "tc_owner" ON trusted_contacts FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "tc_visible" ON trusted_contacts FOR SELECT USING (auth.uid() = contact_user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 5. ARTISTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  bio             TEXT,
  avatar_url      TEXT,
  cover_url       TEXT,
  genres          TEXT[],
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  instagram_url   TEXT,
  spotify_url     TEXT,
  soundcloud_url  TEXT,
  follower_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_artists (
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  artist_id   UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, artist_id)
);

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artists_select" ON artists FOR SELECT USING (true);
CREATE POLICY "artists_modify" ON artists FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND account_type = 'admin')
);

ALTER TABLE event_artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_artists_select" ON event_artists FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────
-- 6. LIVE STREAMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_streams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  stream_key      TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  playback_url    TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended')),
  viewer_count    INTEGER NOT NULL DEFAULT 0,
  peak_viewers    INTEGER NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stream_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id   UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streams_select" ON live_streams FOR SELECT USING (true);
CREATE POLICY "streams_host" ON live_streams FOR ALL USING (auth.uid() = host_id);

ALTER TABLE stream_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions_select" ON stream_reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert" ON stream_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE stream_reactions;

-- ─────────────────────────────────────────────────────────────
-- 7. TICKETS — Add missing columns (may already exist from 009)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attendee_name    TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attendee_email   TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_type      TEXT DEFAULT 'general';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS quantity         INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS total_price      NUMERIC(10,2) DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS checked_in_at    TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS checked_in_by    UUID REFERENCES users(id);

-- ─────────────────────────────────────────────────────────────
-- 8. FOLLOW TYPE — add following_type for artists
-- ─────────────────────────────────────────────────────────────
ALTER TABLE follows  ADD COLUMN IF NOT EXISTS following_type TEXT DEFAULT 'user';

-- ─────────────────────────────────────────────────────────────
-- 9. PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stories_author_expires ON stories (author_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views (story_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members (user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges (user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists (name);

-- ─────────────────────────────────────────────────────────────
-- 10. FOLLOW SUGGESTIONS RPC (used by Discover People)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_follow_suggestions(current_user_id UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id               UUID,
  username         TEXT,
  display_name     TEXT,
  avatar_url       TEXT,
  mutual_count     BIGINT,
  common_interests TEXT[]
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT DISTINCT
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    COUNT(DISTINCT f2.follower_id) AS mutual_count,
    ARRAY[]::TEXT[] AS common_interests
  FROM users u
  JOIN follows f1 ON f1.following_id = u.id
  JOIN follows f2 ON f2.follower_id = f1.follower_id
                  AND f2.following_id = current_user_id
  WHERE u.id != current_user_id
    AND NOT EXISTS (
      SELECT 1 FROM follows f3
      WHERE f3.follower_id = current_user_id AND f3.following_id = u.id
    )
  GROUP BY u.id, u.username, u.display_name, u.avatar_url
  ORDER BY mutual_count DESC
  LIMIT limit_count;
$$;

-- ─────────────────────────────────────────────────────────────
-- 11. LEADERBOARD VIEW
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW weekly_leaderboard AS
SELECT
  u.id,
  u.username,
  u.display_name,
  u.avatar_url,
  u.vibe_points,
  RANK() OVER (ORDER BY u.vibe_points DESC) AS rank
FROM users u
WHERE u.vibe_points > 0
ORDER BY u.vibe_points DESC
LIMIT 100;

-- ─────────────────────────────────────────────────────────────
-- 12. WEATHER CACHE on events
-- ─────────────────────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS weather_cache JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_url TEXT;

-- ─────────────────────────────────────────────────────────────
-- Done
-- ─────────────────────────────────────────────────────────────
