-- ============================================================
-- 014: Safety System (Safe Home / Buddy System)
-- ============================================================

CREATE TABLE IF NOT EXISTS safe_home_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trusted_contact_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'active', -- active | safe | expired | cancelled
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  expected_home_at TIMESTAMPTZ NOT NULL,
  confirmed_safe_at TIMESTAMPTZ,
  last_known_location GEOGRAPHY(POINT, 4326),
  last_location_update TIMESTAMPTZ,
  alert_sent_at   TIMESTAMPTZ
);

CREATE INDEX idx_safe_home_user ON safe_home_sessions(user_id, status);
CREATE INDEX idx_safe_home_contact ON safe_home_sessions(trusted_contact_id, status);

-- RLS
ALTER TABLE safe_home_sessions ENABLE ROW LEVEL SECURITY;

-- Both the user and the trusted contact can see and update the session
CREATE POLICY safe_home_select ON safe_home_sessions FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR auth.uid() = trusted_contact_id
);

CREATE POLICY safe_home_insert ON safe_home_sessions FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY safe_home_update ON safe_home_sessions FOR UPDATE TO authenticated USING (
  auth.uid() = user_id OR auth.uid() = trusted_contact_id
);

-- Insert dummy notification types (doesn't break if already exists because of ON CONFLICT rule, 
-- though PostgreSQL enums/types would be better managed. Assuming it's TEXT in notifications table)
-- We'll insert these conceptually: 'safe_home_request', 'safe_home_arrived', 'safe_home_alert'
