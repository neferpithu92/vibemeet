-- ============================================================
-- 056: Map Engine V4 (People & Media)
-- Adds nearby users and media posts to the get_map_data RPC.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_map_data(
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
  bbox := ST_MakeEnvelope(sw_lon, sw_lat, ne_lon, ne_lat, 4326)::geography;

  SELECT json_build_object(
    'venues', (
      SELECT json_agg(v) FROM (
        SELECT 
            id, name, slug, address, location, 
            public.update_venue_vibe_score(id) as vibe_score,
            public.calculate_venue_crowd_density(id) as crowd_density,
            type, description
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
        AND (p_genres IS NULL OR e.genres && p_genres OR v.genres && p_genres)
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
    ),
    'users', (
      SELECT json_agg(u) FROM (
        SELECT id, username, avatar_url, ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude
        FROM public.users
        WHERE location && bbox
        AND last_seen_at > now() - INTERVAL '15 minutes'
        AND is_active = TRUE
      ) u
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
