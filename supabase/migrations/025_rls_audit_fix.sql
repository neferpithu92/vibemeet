-- ============================================================
-- 025: RLS Audit & Security Fixes
-- Identifies and fixes missing Row Level Security policies
-- across the database to ensure zero gaps in access control.
-- ============================================================

-- Fix: Enable RLS on user_interactions (Missing from 016)
ALTER TABLE IF EXISTS public.user_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_interactions_select ON public.user_interactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_interactions_insert ON public.user_interactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_interactions_delete ON public.user_interactions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- Fix: Enable RLS on user_affinities (Missing from 016)
ALTER TABLE IF EXISTS public.user_affinities ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_affinities_select ON public.user_affinities
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_affinities_insert ON public.user_affinities
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_affinities_update ON public.user_affinities
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_affinities_delete ON public.user_affinities
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- Fix: Add missing DELETE policy for check_ins so users can remove their check-in
DROP POLICY IF EXISTS checkins_delete ON public.check_ins;
CREATE POLICY checkins_delete ON public.check_ins
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- Fix: Add missing DELETE policy for artists so users can manage their artist profile
DROP POLICY IF EXISTS artists_delete ON public.artists;
CREATE POLICY artists_delete ON public.artists
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- Fix: Add missing UPDATE/DELETE for storage.objects
-- Avatars
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Stories
DROP POLICY IF EXISTS "Users can update their own stories" ON storage.objects;
CREATE POLICY "Users can update their own stories" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own stories" ON storage.objects;
CREATE POLICY "Users can delete their own stories" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Media
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;
CREATE POLICY "Users can update their own media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
CREATE POLICY "Users can delete their own media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
