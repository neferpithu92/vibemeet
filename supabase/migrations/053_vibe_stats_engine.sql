-- ============================================================
-- 053: Real Vibe & Crowd Stats Engine
-- Adds capacity to venues and implements real-time stats calculation.
-- ============================================================

BEGIN;

-- 1. Aggiunta colonna capacity per calcolo densità (%)
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 100;

-- 2. Funzione per calcolare la Crowd Density (%) basata sulla presenza reale
CREATE OR REPLACE FUNCTION public.calculate_venue_crowd_density(p_venue_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_venue_location geography;
    v_capacity INTEGER;
    v_active_users INTEGER;
BEGIN
    -- Ottieni posizione e capacità della venue
    SELECT location, capacity INTO v_venue_location, v_capacity
    FROM public.venues WHERE id = p_venue_id;

    -- Conta utenti attivi (visti negli ultimi 15 minuti) entro 50 metri
    SELECT COUNT(*) INTO v_active_users
    FROM public.users
    WHERE ST_DWithin(location, v_venue_location, 50)
    AND last_seen_at > now() - INTERVAL '15 minutes'
    AND is_active = TRUE;

    -- Calcola percentuale (capped at 100%)
    IF v_capacity = 0 THEN RETURN 0; END IF;
    RETURN LEAST(((v_active_users * 100) / v_capacity), 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Funzione per aggiornare il Vibe Score basato sull'attività recente
CREATE OR REPLACE FUNCTION public.update_venue_vibe_score(p_venue_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_venue_location geography;
    v_recent_media INTEGER;
    v_recent_likes INTEGER;
    v_score DECIMAL;
BEGIN
    SELECT location INTO v_venue_location FROM public.venues WHERE id = p_venue_id;

    -- Conteggio media recenti (ultime 3 ore)
    SELECT COUNT(*) INTO v_recent_media
    FROM public.media
    WHERE ST_DWithin(location, v_venue_location, 100)
    AND created_at > now() - INTERVAL '3 hours';

    -- Conteggio like su media recenti
    SELECT COALESCE(SUM(like_count), 0) INTO v_recent_likes
    FROM public.media
    WHERE ST_DWithin(location, v_venue_location, 100)
    AND created_at > now() - INTERVAL '3 hours';

    -- Algoritmo base: (media * 2 + likes / 2) + base 5.0 (per i locali aperti)
    -- Max 10.0
    v_score := 5.0 + (v_recent_media * 0.5) + (v_recent_likes * 0.1);
    
    RETURN LEAST(v_score, 10.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Aggiornamento get_map_data per includere i dati reali (V3)
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
  bbox := ST_MakeEnvelope(sw_lon, sw_lat, ne_lon, ne_lat, 4326)::geography;

  SELECT json_build_object(
    'venues', (
      SELECT json_agg(v) FROM (
        SELECT 
            id, name, slug, address, location, 
            public.update_venue_vibe_score(id) as vibe_score, -- Calcolo live
            public.calculate_venue_crowd_density(id) as crowd_density, -- Calcolo live
            type
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

COMMIT;
