-- ============================================================
-- 057: Fix Stories RLS & Schema Consistency
-- Resolves "new row violates row-level security policy" errors
-- and aligns table structure between Migrations 001 and 045.
-- ============================================================

BEGIN;

-- 1. Clean up existing policies to avoid conflicts or "ghost" policies
DROP POLICY IF EXISTS stories_insert ON public.stories;
DROP POLICY IF EXISTS "stories_insert" ON public.stories;
DROP POLICY IF EXISTS stories_select ON public.stories;
DROP POLICY IF EXISTS "stories_select" ON public.stories;
DROP POLICY IF EXISTS stories_delete ON public.stories;
DROP POLICY IF EXISTS "stories_delete" ON public.stories;
DROP POLICY IF EXISTS stories_update ON public.stories;
DROP POLICY IF EXISTS "stories_update" ON public.stories;

-- 2. Ensure RLS is active
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- 3. Create robust, consolidated policies
-- INSERT: Only authenticated users can insert their own stories
CREATE POLICY "stories_insert_policy" ON public.stories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- SELECT: Anyone can view stories that haven't expired yet
CREATE POLICY "stories_select_policy" ON public.stories
  FOR SELECT USING (expires_at > now());

-- DELETE: Only the author can delete their own stories
CREATE POLICY "stories_delete_policy" ON public.stories
  FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

-- UPDATE: Only the author can update their own stories (e.g. view count)
CREATE POLICY "stories_update_policy" ON public.stories
  FOR UPDATE TO authenticated
  USING (auth.uid() = author_id);

-- 4. Align Schema (Handle potential partial migration from 045)
DO $$
BEGIN
    -- Ensure 'type' column exists (from 045 spec)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stories' AND column_name='type') THEN
        ALTER TABLE public.stories ADD COLUMN "type" TEXT NOT NULL DEFAULT 'photo' CHECK ("type" IN ('photo','video','text'));
    END IF;

    -- Ensure 'entity_type' column exists (from 001 spec)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stories' AND column_name='entity_type') THEN
        ALTER TABLE public.stories ADD COLUMN "entity_type" TEXT DEFAULT 'user';
    END IF;

    -- Ensure 'location' column exists as geography (from 001/023 spec)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stories' AND column_name='location') THEN
        ALTER TABLE public.stories ADD COLUMN "location" GEOGRAPHY(POINT, 4326);
    END IF;

    -- Ensure 'media_url' is nullable if 045 intended to allow text-only stories
    ALTER TABLE public.stories ALTER COLUMN media_url DROP NOT NULL;
END $$;

COMMIT;
