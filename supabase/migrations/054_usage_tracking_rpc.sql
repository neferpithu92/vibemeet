-- ============================================================
-- 054: Usage Tracking RPC
-- Atomic increment for user app usage.
-- ============================================================

-- 1. Table structure (in case 040 didn't run or needs fix)
CREATE TABLE IF NOT EXISTS usage_stats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    total_seconds   INTEGER DEFAULT 0,
    daily_limit     INTEGER DEFAULT NULL,
    UNIQUE(user_id, date)
);

-- 2. RLS
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_owner_all" ON usage_stats;
CREATE POLICY "usage_owner_all" ON usage_stats 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id);

-- 3. Atomic RPC
CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id UUID, p_date DATE, p_seconds INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.usage_stats (user_id, date, total_seconds)
  VALUES (p_user_id, p_date, p_seconds)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    total_seconds = usage_stats.total_seconds + p_seconds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
