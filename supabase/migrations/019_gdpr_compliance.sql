-- ============================================================
-- 019: GDPR & Compliance
-- Age verification, terms acceptance, data deletion logs
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  accepted_terms_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  accepted_privacy_at TIMESTAMPTZ;

-- Cookie Preferences
CREATE TABLE IF NOT EXISTS cookie_preferences (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  essential         BOOLEAN DEFAULT TRUE, -- Always true
  analytics         BOOLEAN DEFAULT FALSE,
  marketing         BOOLEAN DEFAULT FALSE,
  personalization   BOOLEAN DEFAULT FALSE,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Delete requests log (For compliance auditing)
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL, -- Not a foreign key because user will be deleted
  username        TEXT,
  email_hash      TEXT, -- Hashed for privacy
  reason          TEXT,
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  status          TEXT DEFAULT 'pending' -- 'pending', 'processed', 'cancelled'
);

-- Create GDPR view function to fetch all user data (Right to Access)
CREATE OR REPLACE FUNCTION get_user_gdpr_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user JSONB;
  v_posts JSONB;
  v_comments JSONB;
  v_tickets JSONB;
BEGIN
  -- Assicurati che l'utente stia chiedendo i propri dati o sia un admin
  IF auth.uid() != p_user_id THEN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;

  SELECT row_to_json(u)::jsonb INTO v_user FROM users u WHERE id = p_user_id;
  SELECT jsonb_agg(row_to_json(m)) INTO v_posts FROM media m WHERE author_id = p_user_id;
  SELECT jsonb_agg(row_to_json(c)) INTO v_comments FROM comments c WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'account_info', v_user,
    'posts', COALESCE(v_posts, '[]'::jsonb),
    'comments', COALESCE(v_comments, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE cookie_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY cookie_select ON cookie_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY cookie_insert ON cookie_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY cookie_update ON cookie_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY del_req_insert ON account_deletion_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
