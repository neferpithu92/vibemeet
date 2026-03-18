-- ============================================================
-- 008: Privacy System
-- Account types, friendships, profile visibility
-- ============================================================

-- Account type: public (default) or private
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  account_type TEXT DEFAULT 'public'; -- public | private

-- Friendships (bidirectional requests)
CREATE TABLE IF NOT EXISTS friendships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'pending', -- pending | accepted | blocked
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- Trigger updated_at
CREATE TRIGGER set_updated_at_friendships 
  BEFORE UPDATE ON friendships 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY friendships_select ON friendships FOR SELECT USING (
  auth.uid() = requester_id OR auth.uid() = addressee_id
);

CREATE POLICY friendships_insert ON friendships FOR INSERT 
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY friendships_update ON friendships FOR UPDATE USING (
  auth.uid() = addressee_id -- only addressee can accept/reject
);

CREATE POLICY friendships_delete ON friendships FOR DELETE USING (
  auth.uid() = requester_id OR auth.uid() = addressee_id
);

-- Function: can current user view target profile?
CREATE OR REPLACE FUNCTION can_view_profile(viewer_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Same user: always
  IF viewer_id = target_id THEN RETURN TRUE; END IF;
  
  -- Public account: always
  IF (SELECT account_type FROM users WHERE id = target_id) = 'public' THEN
    RETURN TRUE;
  END IF;
  
  -- Private account: only accepted friends
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = viewer_id AND addressee_id = target_id) OR
      (requester_id = target_id AND addressee_id = viewer_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
