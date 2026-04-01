-- ============================================================
-- 036: Fix Venues Vibe Score
-- Align venues with events by adding vibe_score column
-- and updating get_map_data RPC.
-- ============================================================

-- 1. Add vibe_score to venues (as alias for avg_rating or new metric)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'vibe_score') THEN
    ALTER TABLE public.venues ADD COLUMN vibe_score DECIMAL(3,2) DEFAULT 0;
    -- Initial sync: sync vibe_score with avg_rating
    UPDATE public.venues SET vibe_score = COALESCE(avg_rating, 0);
  END IF;
END $$;

-- 2. Update get_map_data to ensure it selects the correct columns
CREATE OR REPLACE FUNCTION public.get_map_data(
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
        FROM public.venues
        WHERE location && bbox
      ) v
    ),
    'events', (
      SELECT json_agg(e) FROM (
        SELECT e.*, row_to_json(v) as venue
        FROM public.events e
        JOIN public.venues v ON e.venue_id = v.id
        WHERE v.location && bbox
        AND e.ends_at >= now()
      ) e
    ),
    'stories', (
      SELECT json_agg(s) FROM (
        SELECT s.*, row_to_json(p) as profiles
        FROM public.stories s
        JOIN public.users p ON s.author_id = p.id
        WHERE s.location && bbox
        AND (NOT last_24h_stories OR s.expires_at > now())
      ) s
    ),
    'media', (
      SELECT json_agg(m) FROM (
        SELECT m.*, row_to_json(p) as profiles
        FROM public.media m
        JOIN public.users p ON m.user_id = p.id
        WHERE m.location && bbox
        AND m.created_at > now() - INTERVAL '48 hours'
      ) m
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
