-- ============================================================
-- 999: PRODUCTION SCHEMA SYNC (CRITICAL FIX)
-- Execute this in Supabase SQL Editor to resolve 404/PGRST errors
-- ============================================================

BEGIN;

-- 1. Ensure 'user_settings' exists for Theme and App Preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  theme_preset TEXT DEFAULT 'system',
  custom_theme_hsl JSONB DEFAULT '{"h": 260, "s": 100, "l": 60}'::jsonb,
  is_private BOOLEAN DEFAULT false,
  show_activity BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  usage_limit_minutes INTEGER DEFAULT 0,
  language TEXT DEFAULT 'it',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings" ON public.user_settings 
  FOR ALL USING (auth.uid() = user_id);

-- Initialize settings for all existing users
INSERT INTO public.user_settings (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;


-- 2. Ensure 'user_onboarding_interests' exists for Onboarding Persistence
CREATE TABLE IF NOT EXISTS public.user_onboarding_interests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  selected_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Enable RLS for user_onboarding_interests
ALTER TABLE public.user_onboarding_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own interests" ON public.user_onboarding_interests;
CREATE POLICY "Users can manage own interests" ON public.user_onboarding_interests 
  FOR ALL USING (auth.uid() = user_id);


-- 3. Ensure 'usage_stats' exists for Time Tracking
CREATE TABLE IF NOT EXISTS public.usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes_used INTEGER DEFAULT 0,
  daily_limit_minutes INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_stats;
CREATE POLICY "Users can view own usage" ON public.usage_stats 
  FOR ALL USING (auth.uid() = user_id);


-- 4. RPC: increment_usage
-- Required by the app analytics client
CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.usage_stats (user_id, date, minutes_used)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET minutes_used = public.usage_stats.minutes_used + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Fix missing columns in 'users'
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS 
  onboarding_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS 
  account_type TEXT DEFAULT 'public';

COMMIT;
