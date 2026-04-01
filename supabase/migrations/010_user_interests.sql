-- ============================================================
-- 010: User Interests (Onboarding)
-- Interest categories for personalized onboarding flow
-- ============================================================

CREATE TABLE IF NOT EXISTS user_onboarding_interests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category        TEXT NOT NULL, -- music genre / venue type / activity
  selected_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

CREATE INDEX idx_user_interests_user ON user_onboarding_interests(user_id);
CREATE INDEX idx_user_interests_cat ON user_onboarding_interests(category);

-- RLS
ALTER TABLE user_onboarding_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_interests_select ON user_onboarding_interests FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY user_interests_insert ON user_onboarding_interests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_interests_delete ON user_onboarding_interests FOR DELETE USING (
  auth.uid() = user_id
);

-- Add onboarding_completed flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  onboarding_completed BOOLEAN DEFAULT FALSE;
