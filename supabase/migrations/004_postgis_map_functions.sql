-- ============================================================
-- VIBE Platform — Migrazione 004: Funzioni PostGIS & RPC
-- ============================================================

-- 1. Funzione per aggiornare la posizione utente (Geography)
CREATE OR REPLACE FUNCTION update_user_location(lon float8, lat float8)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET 
    last_location = ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
    last_seen_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Funzione per recuperare tutti i dati della mappa in un solo colpo (BBOX)
-- Ottimizza il fetching di Venues, Events e Stories filtrando per bounding box
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
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
