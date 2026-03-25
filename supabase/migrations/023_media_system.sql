-- ============================================================
-- 023: Media System Fix & Alignment (System 6 & 14)
-- Aligns existing media table with production spec and updates Map RPC
-- ============================================================

DO $$
BEGIN
    -- RENAME author_id to user_id if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media' AND column_name='author_id') THEN
        ALTER TABLE public.media RENAME COLUMN author_id TO user_id;
    END IF;

    -- RENAME url to media_url if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media' AND column_name='url') THEN
        ALTER TABLE public.media RENAME COLUMN url TO media_url;
    END IF;

    -- RENAME type to media_type if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media' AND column_name='type') THEN
        ALTER TABLE public.media RENAME COLUMN "type" TO media_type;
    END IF;

    -- Ensure missing columns according to spec
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media' AND column_name='thumbnail_url') THEN
        ALTER TABLE public.media ADD COLUMN thumbnail_url TEXT;
    END IF;

    -- Location should be GEOGRAPHY (matching initial schema and stories)
    -- If it was mistakenly added as JSONB by a previous step (or if I want to be safe)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media' AND column_name='location' AND data_type='jsonb') THEN
        ALTER TABLE public.media DROP COLUMN location;
        ALTER TABLE public.media ADD COLUMN location GEOGRAPHY(POINT, 4326);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media' AND column_name='created_at') THEN
        ALTER TABLE public.media ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

END $$;

-- Update get_map_data to include Feed Posts (System 7)
CREATE OR REPLACE FUNCTION get_map_data(
  sw_lon float8, sw_lat float8, 
  ne_lon float8, ne_lat float8,
  last_24h_stories boolean DEFAULT true
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  bbox geography;
BEGIN
  -- Crea il poligono BBOX
  bbox := ST_MakeEnvelope(sw_lon, sw_lat, ne_lon, ne_lat, 4326)::geography;

  SELECT json_build_object(
    'venues', (
      SELECT json_agg(v) FROM (
        SELECT id, name, slug, address, location, vibe_score, type
        FROM venues
        WHERE location && bbox
      ) v
    ),
    'events', (
      SELECT json_agg(e) FROM (
        SELECT e.*, row_to_json(v) as venue
        FROM events e
        JOIN venues v ON e.venue_id = v.id
        WHERE v.location && bbox
        AND e.ends_at >= now()
      ) e
    ),
    'stories', (
      SELECT json_agg(s) FROM (
        SELECT s.*, row_to_json(p) as profiles
        FROM stories s
        JOIN users p ON s.author_id = p.id
        WHERE s.location && bbox
        AND (NOT last_24h_stories OR s.expires_at > now())
      ) s
    ),
    'media', (  -- ADDIZIONALE: Mostra i Feed Posts sulla mappa! (System 7)
      SELECT json_agg(m) FROM (
        SELECT m.*, row_to_json(p) as profiles
        FROM media m
        JOIN users p ON m.user_id = p.id
        WHERE m.location && bbox
        AND m.created_at > now() - INTERVAL '48 hours'
      ) m
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Enable Realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.media;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
