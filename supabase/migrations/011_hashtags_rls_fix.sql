-- ============================================================
-- 011_hashtags_rls_fix.sql
-- Allowing anonymous read for hashtags and trending system
-- ============================================================

-- Drop old policies
DROP POLICY IF EXISTS hashtags_select ON hashtags;
DROP POLICY IF EXISTS post_hashtags_select ON post_hashtags;
DROP POLICY IF EXISTS trending_select ON trending_hashtags;

-- Create new public read policies
CREATE POLICY hashtags_public_read ON hashtags FOR SELECT USING (true);
CREATE POLICY post_hashtags_public_read ON post_hashtags FOR SELECT USING (true);
CREATE POLICY trending_public_read ON trending_hashtags FOR SELECT USING (true);

-- Ensure write policies still require authentication
DROP POLICY IF EXISTS hashtags_insert ON hashtags;
CREATE POLICY hashtags_insert_auth ON hashtags FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS post_hashtags_insert ON post_hashtags;
CREATE POLICY post_hashtags_insert_auth ON post_hashtags FOR INSERT TO authenticated WITH CHECK (true);
