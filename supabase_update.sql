-- ============================================================
-- 021: User Sync Trigger (SQL Update for Supabase)
-- Creates an automatic profile in public.users when 
-- a user signs up or logs in via Google/OAuth.
-- ============================================================

-- 1. Create the function that will handle the new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    -- Get username from metadata (Google) or fallback to email part
    COALESCE(
      LOWER(REPLACE(new.raw_user_meta_data->>'username', ' ', '_')), 
      LOWER(REPLACE(split_part(new.email, '@', 1), '.', '_')),
      'user_' || substr(new.id::text, 1, 8)
    ),
    -- Get display name from metadata or fallback to email
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(public.users.display_name, EXCLUDED.display_name),
    avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url);
    
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. (Optional) Run once for existing users if any are missing
-- INSERT INTO public.users (id, email, username, display_name, avatar_url)
-- SELECT id, email, 
--   COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)),
--   COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1)),
--   raw_user_meta_data->>'avatar_url'
-- FROM auth.users
-- ON CONFLICT (id) DO NOTHING;
