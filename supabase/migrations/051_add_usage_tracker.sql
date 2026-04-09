-- ============================================================
-- 051: Production Sync - Onboarding & Usage Infrastructure
-- Fixes missing tables and functions found during Beta Test
-- ============================================================

-- 1. Ensure Onboarding Interests table exists
CREATE TABLE IF NOT EXISTS public.user_onboarding_interests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  selected_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Enable RLS
ALTER TABLE public.user_onboarding_interests ENABLE ROW LEVEL SECURITY;

-- Simple Policies
DROP POLICY IF EXISTS "allow_all_own" ON public.user_onboarding_interests;
CREATE POLICY "allow_all_own" ON public.user_onboarding_interests 
  FOR ALL USING (auth.uid() = user_id);

-- 2. Add onboarding_completed flag to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS 
  onboarding_completed BOOLEAN DEFAULT FALSE;

-- 3. Usage Tracker RPC
-- Triggers whenever app usage is tracked on client
CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Logic for analytics (can be expanded later)
  -- For now, just a stub to avoid 404
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
