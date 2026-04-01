-- ============================================================
-- 022: Storage Buckets Setup
-- Setup for avatars, stories, and media content
-- ============================================================

-- 1. Avatars Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for Avatars
DROP POLICY IF EXISTS "Public Access for Avatars" ON storage.objects;
CREATE POLICY "Public Access for Avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Stories Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for Stories
DROP POLICY IF EXISTS "Public Access for Stories" ON storage.objects;
CREATE POLICY "Public Access for Stories" ON storage.objects
  FOR SELECT USING (bucket_id = 'stories');

DROP POLICY IF EXISTS "Users can upload their own stories" ON storage.objects;
CREATE POLICY "Users can upload their own stories" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stories' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Events Bucket (Fix: was numbered 2. as well)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for Events
DROP POLICY IF EXISTS "Public Access for Events" ON storage.objects;
CREATE POLICY "Public Access for Events" ON storage.objects
  FOR SELECT USING (bucket_id = 'events');

DROP POLICY IF EXISTS "Users can upload event covers" ON storage.objects;
CREATE POLICY "Users can upload event covers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'events');

-- 3. Media Bucket (Feed Posts)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for Media
DROP POLICY IF EXISTS "Public Access for Media" ON storage.objects;
CREATE POLICY "Public Access for Media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Users can upload post media" ON storage.objects;
CREATE POLICY "Users can upload post media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );
