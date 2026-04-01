-- ============================================================
-- VIBE Platform — Funzioni Social (RSVP Counters)
-- ============================================================

-- Funzione per incrementare il counter RSVP degli eventi
CREATE OR REPLACE FUNCTION increment_rsvp(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE events
  SET rsvp_count = rsvp_count + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per decrementare il counter RSVP degli eventi
CREATE OR REPLACE FUNCTION decrement_rsvp(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE events
  SET rsvp_count = GREATEST(0, rsvp_count - 1)
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per incrementare il counter Like dei media
CREATE OR REPLACE FUNCTION increment_media_like(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media
  SET like_count = like_count + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per decrementare il counter Like dei media
CREATE OR REPLACE FUNCTION decrement_media_like(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per ottenere l'affollamento live di una venue (ultime 4 ore)
CREATE OR REPLACE FUNCTION get_venue_crowd(v_id UUID)
RETURNS INTEGER AS $$
DECLARE
  crowd_count INTEGER;
BEGIN
  SELECT count(*) INTO crowd_count
  FROM check_ins
  WHERE venue_id = v_id
    AND created_at > (NOW() - INTERVAL '4 hours');
  RETURN crowd_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per ottenere l'affollamento live di un evento (ultime 4 ore)
CREATE OR REPLACE FUNCTION get_event_crowd(e_id UUID)
RETURNS INTEGER AS $$
DECLARE
  crowd_count INTEGER;
BEGIN
  SELECT count(*) INTO crowd_count
  FROM check_ins
  WHERE event_id = e_id
    AND created_at > (NOW() - INTERVAL '4 hours');
  RETURN crowd_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
