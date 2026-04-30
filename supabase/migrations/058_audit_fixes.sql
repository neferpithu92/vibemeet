-- ============================================================
-- MIGRATION 058: Audit Fixes — Weather Cache + Map Schema
-- VibeMeet Production — 2026-04-30
-- ============================================================

BEGIN;

-- 1. Aggiunge weather_cache agli eventi se non esiste
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='events' AND column_name='weather_cache'
    ) THEN
        ALTER TABLE public.events ADD COLUMN weather_cache JSONB DEFAULT NULL;
        RAISE NOTICE 'weather_cache column added to events';
    ELSE
        RAISE NOTICE 'weather_cache already exists, skipping';
    END IF;
END $$;

-- 2. Aggiunge cover_url agli eventi se non esiste (usata nel detail page)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='events' AND column_name='cover_url'
    ) THEN
        ALTER TABLE public.events ADD COLUMN cover_url TEXT DEFAULT NULL;
        RAISE NOTICE 'cover_url column added to events';
    END IF;
END $$;

-- 3. Assicura che media.view_count esista (rinomina da comment_count se necessario)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='media' AND column_name='view_count'
    ) THEN
        ALTER TABLE public.media ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'view_count column added to media';
    END IF;
END $$;

-- 4. Crea indice su events.weather_cache per le query del cron (update WHERE)
CREATE INDEX IF NOT EXISTS idx_events_weather_cache_null 
ON public.events (starts_at) 
WHERE weather_cache IS NULL;

-- 5. Aggiorna RLS su media per includere la nuova policy per view_count increment
-- Gli utenti autenticati possono incrementare view_count
DROP POLICY IF EXISTS "Users can update view count on media" ON public.media;
CREATE POLICY "Users can update view count on media"
ON public.media FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Assicura che hashtags.count esista (non post_count)
DO $$ BEGIN
    -- Se esiste post_count ma non count, rinomina
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='hashtags' AND column_name='post_count'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='hashtags' AND column_name='count'
    ) THEN
        ALTER TABLE public.hashtags RENAME COLUMN post_count TO count;
        RAISE NOTICE 'hashtags.post_count renamed to count';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='hashtags' AND column_name='count'
    ) THEN
        ALTER TABLE public.hashtags ADD COLUMN count INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'hashtags.count column added';
    ELSE
        RAISE NOTICE 'hashtags.count already exists, skipping';
    END IF;
END $$;

-- 7. Assicura last_used_at su hashtags
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='hashtags' AND column_name='last_used_at'
    ) THEN
        ALTER TABLE public.hashtags ADD COLUMN last_used_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 8. Ricarica schema cache PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
