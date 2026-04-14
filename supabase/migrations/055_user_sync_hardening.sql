-- ============================================================
-- 055: User Sync Hardening & Backfill
-- Ensures all users in auth.users have a profile in public.users
-- and hardens the trigger for future updates.
-- ============================================================

-- 1. Hardened Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      LOWER(REPLACE(new.raw_user_meta_data->>'username', ' ', '_')), 
      LOWER(REPLACE(split_part(new.email, '@', 1), '.', '_'))
    ),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(EXCLUDED.username, public.users.username),
    display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Backfill existing users
-- This ensures that any user previously missed by the trigger gets a record.
INSERT INTO public.users (id, email, username, display_name, avatar_url)
SELECT 
    id, 
    email,
    COALESCE(
      LOWER(REPLACE(raw_user_meta_data->>'username', ' ', '_')), 
      LOWER(REPLACE(split_part(email, '@', 1), '.', '_'))
    ) as username,
    COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1)) as display_name,
    raw_user_meta_data->>'avatar_url' as avatar_url
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. Ensure Trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
