-- ============================================================
-- VIBE Platform — Schema Database Completo
-- PostgreSQL 15 + PostGIS + pgvector
-- ============================================================

-- Estensioni necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
-- CREATE EXTENSION IF NOT EXISTS "pgvector"; -- abilitare quando necessario

-- ============================================================
-- TABELLA: users
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT UNIQUE,
  username        TEXT UNIQUE NOT NULL,
  display_name    TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  language        TEXT DEFAULT 'it',
  role            TEXT DEFAULT 'user', -- user | venue | artist | admin
  is_verified     BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  two_fa_enabled  BOOLEAN DEFAULT FALSE,
  map_visibility  TEXT DEFAULT 'friends', -- public | friends | private
  location        GEOGRAPHY(POINT, 4326),
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_location ON users USING GIST(location);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- TABELLA: subscriptions (creata prima per FK da venues)
-- ============================================================
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL,
  entity_type     TEXT NOT NULL, -- venue | artist
  plan            TEXT NOT NULL DEFAULT 'starter', -- starter | basic | pro | premium | artist_free | artist_pro
  status          TEXT NOT NULL DEFAULT 'active', -- active | canceled | past_due | trialing
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_entity ON subscriptions(entity_id, entity_type);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- ============================================================
-- TABELLA: venues
-- ============================================================
CREATE TABLE venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT,
  type            TEXT, -- bar | club | restaurant | festival | outdoor
  address         TEXT,
  city            TEXT,
  country         TEXT DEFAULT 'CH',
  location        GEOGRAPHY(POINT, 4326) NOT NULL,
  cover_url       TEXT,
  logo_url        TEXT,
  opening_hours   JSONB,
  music_genres    TEXT[],
  amenities       JSONB,
  contact_info    JSONB,
  subscription_id UUID REFERENCES subscriptions(id),
  is_verified     BOOLEAN DEFAULT FALSE,
  avg_rating      DECIMAL(3,2) DEFAULT 0,
  follower_count  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_venues_location ON venues USING GIST(location);
CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_slug ON venues(slug);
CREATE INDEX idx_venues_type ON venues(type);

-- ============================================================
-- TABELLA: events
-- ============================================================
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id        UUID REFERENCES venues(id) ON DELETE SET NULL,
  organizer_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  slug            TEXT UNIQUE NOT NULL,
  location        GEOGRAPHY(POINT, 4326) NOT NULL,
  address         TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ,
  music_genres    TEXT[],
  artists         UUID[],
  ticket_price    DECIMAL(10,2),
  ticket_url      TEXT,
  expected_crowd  INTEGER,
  actual_crowd    INTEGER DEFAULT 0,
  cover_url       TEXT,
  media_urls      TEXT[],
  status          TEXT DEFAULT 'scheduled', -- draft | scheduled | live | ended | cancelled
  is_promoted     BOOLEAN DEFAULT FALSE,
  view_count      INTEGER DEFAULT 0,
  rsvp_count      INTEGER DEFAULT 0,
  weather_cache   JSONB,
  tags            TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_location ON events USING GIST(location);
CREATE INDEX idx_events_starts_at ON events(starts_at);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_venue ON events(venue_id);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_slug ON events(slug);

-- ============================================================
-- TABELLA: media
-- ============================================================
CREATE TABLE media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type     TEXT NOT NULL, -- event | venue | user | story
  entity_id       UUID NOT NULL,
  type            TEXT NOT NULL, -- photo | video | reel | live
  url             TEXT NOT NULL,
  thumbnail_url   TEXT,
  duration_sec    INTEGER,
  caption         TEXT,
  location        GEOGRAPHY(POINT, 4326),
  view_count      INTEGER DEFAULT 0,
  like_count      INTEGER DEFAULT 0,
  comment_count   INTEGER DEFAULT 0,
  share_count     INTEGER DEFAULT 0,
  is_featured     BOOLEAN DEFAULT FALSE,
  expires_at      TIMESTAMPTZ,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_entity ON media(entity_type, entity_id);
CREATE INDEX idx_media_location ON media USING GIST(location);
CREATE INDEX idx_media_created ON media(created_at DESC);
CREATE INDEX idx_media_author ON media(author_id);

-- ============================================================
-- TABELLA: followers
-- ============================================================
CREATE TABLE followers (
  follower_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id    UUID NOT NULL,
  entity_type     TEXT DEFAULT 'user', -- user | venue | artist
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id, entity_type)
);

CREATE INDEX idx_followers_following ON followers(following_id);
CREATE INDEX idx_followers_follower ON followers(follower_id);

-- ============================================================
-- TABELLA: artists
-- ============================================================
CREATE TABLE artists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  genres          TEXT[],
  bio             TEXT,
  social_links    JSONB,
  avatar_url      TEXT,
  cover_url       TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  follower_count  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_artists_user ON artists(user_id);

-- ============================================================
-- TABELLA: stories (auto-delete dopo 24h con pg_cron)
-- ============================================================
CREATE TABLE stories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type     TEXT DEFAULT 'user', -- user | venue | event
  media_url       TEXT NOT NULL,
  thumbnail_url   TEXT,
  location        GEOGRAPHY(POINT, 4326),
  caption         TEXT,
  view_count      INTEGER DEFAULT 0,
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stories_author ON stories(author_id);
CREATE INDEX idx_stories_expires ON stories(expires_at);
CREATE INDEX idx_stories_location ON stories USING GIST(location);

-- ============================================================
-- TABELLA: likes (PK composita)
-- ============================================================
CREATE TABLE likes (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL, -- media | comment | event | story
  entity_id       UUID NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);

CREATE INDEX idx_likes_entity ON likes(entity_type, entity_id);

-- ============================================================
-- TABELLA: comments (annidati con parent_id)
-- ============================================================
CREATE TABLE comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL, -- media | event | venue
  entity_id       UUID NOT NULL,
  body            TEXT NOT NULL,
  parent_id       UUID REFERENCES comments(id) ON DELETE CASCADE,
  like_count      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);

-- ============================================================
-- TABELLA: notifications
-- ============================================================
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL, -- like | comment | follow | event_reminder | rsvp | checkin
  actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type     TEXT, -- media | event | venue | user
  entity_id       UUID,
  message         TEXT,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- TABELLA: payments
-- ============================================================
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL,
  entity_type     TEXT NOT NULL, -- venue | user
  amount          DECIMAL(10,2) NOT NULL,
  currency        TEXT DEFAULT 'CHF',
  stripe_payment_id TEXT,
  status          TEXT DEFAULT 'pending', -- pending | succeeded | failed | refunded
  description     TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_entity ON payments(entity_id, entity_type);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_id);

-- ============================================================
-- TABELLA: check_ins
-- ============================================================
CREATE TABLE check_ins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_id        UUID REFERENCES venues(id) ON DELETE SET NULL,
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  location        GEOGRAPHY(POINT, 4326),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkins_user ON check_ins(user_id);
CREATE INDEX idx_checkins_venue ON check_ins(venue_id);
CREATE INDEX idx_checkins_event ON check_ins(event_id);
CREATE INDEX idx_checkins_created ON check_ins(created_at DESC);

-- ============================================================
-- TABELLA: analytics_events
-- ============================================================
CREATE TABLE analytics_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL, -- venue | event | media | user
  entity_id       UUID NOT NULL,
  event_type      TEXT NOT NULL, -- view | click | share | rsvp | checkin | impression
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata        JSONB,
  ts              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_entity ON analytics_events(entity_type, entity_id);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_ts ON analytics_events(ts DESC);

-- ============================================================
-- TABELLA: reports
-- ============================================================
CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL, -- media | user | event | venue | comment
  entity_id       UUID NOT NULL,
  reason          TEXT NOT NULL, -- spam | abuse | inappropriate | copyright | other
  description     TEXT,
  status          TEXT DEFAULT 'pending', -- pending | reviewed | resolved | dismissed
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_entity ON reports(entity_type, entity_id);

-- ============================================================
-- TRIGGER: updated_at automatico
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Applica trigger updated_at a tutte le tabelle con colonna updated_at
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_venues BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_events BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_artists BEFORE UPDATE ON artists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_comments BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_subscriptions BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON users FOR SELECT USING (true); -- profili pubblici leggibili
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id); -- solo il proprio profilo
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- VENUES
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY venues_select ON venues FOR SELECT USING (true); -- venue pubbliche
CREATE POLICY venues_insert ON venues FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY venues_update ON venues FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY venues_delete ON venues FOR DELETE USING (auth.uid() = owner_id);

-- EVENTS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_select ON events FOR SELECT USING (true); -- eventi pubblici
CREATE POLICY events_insert ON events FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY events_update ON events FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY events_delete ON events FOR DELETE USING (auth.uid() = organizer_id);

-- MEDIA
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_select ON media FOR SELECT USING (true);
CREATE POLICY media_insert ON media FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY media_update ON media FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY media_delete ON media FOR DELETE USING (auth.uid() = author_id);

-- FOLLOWERS
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY followers_select ON followers FOR SELECT USING (true);
CREATE POLICY followers_insert ON followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY followers_delete ON followers FOR DELETE USING (auth.uid() = follower_id);

-- STORIES
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY stories_select ON stories FOR SELECT USING (expires_at > NOW());
CREATE POLICY stories_insert ON stories FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY stories_delete ON stories FOR DELETE USING (auth.uid() = author_id);

-- LIKES
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY likes_select ON likes FOR SELECT USING (true);
CREATE POLICY likes_insert ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY likes_delete ON likes FOR DELETE USING (auth.uid() = user_id);

-- COMMENTS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY comments_select ON comments FOR SELECT USING (true);
CREATE POLICY comments_insert ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY comments_update ON comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY comments_delete ON comments FOR DELETE USING (auth.uid() = author_id);

-- NOTIFICATIONS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notifications_update ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- CHECK_INS
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY checkins_select ON check_ins FOR SELECT USING (true);
CREATE POLICY checkins_insert ON check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- REPORTS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY reports_insert ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY reports_select ON reports FOR SELECT USING (auth.uid() = reporter_id);

-- SUBSCRIPTIONS (solo server-side / service role per gestione)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_select ON subscriptions FOR SELECT USING (
  auth.uid() = entity_id OR 
  auth.uid() IN (SELECT owner_id FROM venues WHERE id = entity_id)
);

-- PAYMENTS (solo server-side / service role per gestione)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select ON payments FOR SELECT USING (
  auth.uid() = entity_id OR
  auth.uid() IN (SELECT owner_id FROM venues WHERE id = entity_id)
);

-- ANALYTICS_EVENTS (solo select per owner)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_select ON analytics_events FOR SELECT USING (
  auth.uid() = user_id OR 
  auth.uid() IN (SELECT organizer_id FROM events WHERE id = entity_id) OR
  auth.uid() IN (SELECT owner_id FROM venues WHERE id = entity_id)
);
CREATE POLICY analytics_insert ON analytics_events FOR INSERT WITH CHECK (true); -- eventi analytics registrati da chiunque

-- ARTISTS (public read, owner write)
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY artists_select ON artists FOR SELECT USING (true);
CREATE POLICY artists_insert ON artists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY artists_update ON artists FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- ROLLBACK Notes
-- ============================================================
-- Per fare rollback di questa migrazione:
-- DROP TABLE IF EXISTS reports, analytics_events, check_ins, payments, 
--   subscriptions, notifications, comments, likes, stories, artists,
--   followers, media, events, venues, users CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
