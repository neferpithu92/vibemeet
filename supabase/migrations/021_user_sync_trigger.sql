-- ============================================================
-- 021: User Sync Trigger
-- Automates the creation of a profile in public.users 
-- when a new user signs up via Supabase Auth.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    -- Usa lo slugified username dai metadata o la parte prima dell'email
    COALESCE(
      LOWER(REPLACE(new.raw_user_meta_data->>'username', ' ', '_')), 
      LOWER(REPLACE(split_part(new.email, '@', 1), '.', '_'))
    ),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: si attiva dopo l'inserimento in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
