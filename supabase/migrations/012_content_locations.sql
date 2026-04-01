-- ============================================================
-- 012: Content Locations
-- Mandatory location for posts, Map content view function
-- ============================================================

-- Ensure location columns exist on media
ALTER TABLE media ADD COLUMN IF NOT EXISTS 
  location_name TEXT;
ALTER TABLE media ADD COLUMN IF NOT EXISTS
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;

-- Create PostGIS index if not already present (from 001 but good to be safe)
CREATE INDEX IF NOT EXISTS idx_media_location ON media USING GIST(location);

-- Function to efficiently get map content (Vibes/Photos as pins)
CREATE OR REPLACE FUNCTION get_map_content(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km INTEGER DEFAULT 5,
  content_types TEXT[] DEFAULT ARRAY['photo', 'reel', 'story']
)
RETURNS TABLE (
  id UUID, 
  type TEXT, 
  thumbnail_url TEXT, 
  lat DOUBLE PRECISION, 
  lng DOUBLE PRECISION,
  venue_name TEXT, 
  like_count INTEGER, 
  author_username TEXT
) AS $$
  SELECT m.id, m.type, m.thumbnail_url,
    ST_Y(m.location::geometry) as lat,
    ST_X(m.location::geometry) as lng,
    v.name as venue_name, m.like_count,
    u.username as author_username
  FROM media m
  LEFT JOIN venues v ON v.id = m.venue_id
  LEFT JOIN users u ON u.id = m.author_id
  WHERE m.location IS NOT NULL
    AND ST_DWithin(m.location, ST_MakePoint(lng, lat)::geography, radius_km * 1000)
    AND m.type = ANY(content_types)
    AND m.created_at > NOW() - INTERVAL '48 hours' -- Solo contenuti recenti per la mappa
  ORDER BY m.created_at DESC
  LIMIT 50;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
