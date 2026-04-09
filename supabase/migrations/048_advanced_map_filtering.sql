-- ============================================================
-- 048: Advanced Map Filtering
-- Updates get_map_data to support genre filtering and more meta info.
-- ============================================================

CREATE OR REPLACE FUNCTION get_map_data(
  sw_lon float8, sw_lat float8, 
  ne_lon float8, ne_lat float8,
  last_24h_stories boolean DEFAULT true,
  p_genres text[] DEFAULT NULL
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
        SELECT id, name, slug, address, location, vibe_score, type, description
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
        AND (p_genres IS NULL OR e.genres && p_genres OR v.genres && p_genres)
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
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
