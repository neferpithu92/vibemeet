-- 997: Map Presence Stress Simulation (10k Users)
-- Generates 10,000 fake users with random map positions in Switzerland (Zurich area).

CREATE OR REPLACE FUNCTION simulate_map_presence_stress(
  p_center_lng DECIMAL DEFAULT 8.5417,
  p_center_lat DECIMAL DEFAULT 47.3769,
  p_radius_km DECIMAL DEFAULT 10.0,
  p_user_count INT DEFAULT 10000
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
  v_fake_user_id UUID;
  v_lng DECIMAL;
  v_lat DECIMAL;
  i INT;
BEGIN
  -- We clear old stress users to avoid bloat (optional, but cleaner)
  DELETE FROM users WHERE email LIKE 'map_stress_%';

  FOR i IN 1..p_user_count LOOP
    -- Random jitter around center for 10km radius approx
    v_lng := p_center_lng + (random() - 0.5) * (p_radius_km / 50.0);
    v_lat := p_center_lat + (random() - 0.5) * (p_radius_km / 111.0);
    
    v_fake_user_id := gen_random_uuid();
    
    INSERT INTO users (
      id, 
      email, 
      username, 
      display_name, 
      location, 
      last_seen_at, 
      is_active,
      map_visibility
    )
    VALUES (
      v_fake_user_id, 
      'map_stress_' || i || '@test.vibe.ch', 
      'test_user_' || i, 
      'Active User ' || i, 
      ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326),
      NOW(),
      TRUE,
      'public'
    ) ON CONFLICT (email) DO NOTHING;
  END LOOP;

  RETURN QUERY SELECT TRUE, 'Simulazione 10k utenti completata: ' || p_user_count || ' utenti sparpagliati sulla mappa.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
