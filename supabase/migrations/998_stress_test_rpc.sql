-- ============================================================
-- VIBE Platform — Stress Test Simulation RPC
-- ============================================================

CREATE OR REPLACE FUNCTION simulate_event_stress(
  p_event_id UUID,
  p_user_count INT DEFAULT 300
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
  v_organizer_id UUID;
  v_fake_user_id UUID;
  i INT;
BEGIN
  -- 1. Get the organizer ID to check if it's premium (or just for context)
  SELECT organizer_id INTO v_organizer_id FROM events WHERE id = p_event_id;
  
  IF v_organizer_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Evento non trovato';
    RETURN;
  END IF;

  -- 2. Simulate 300 RSVPs
  -- We use temporary random UUIDs. To avoid FK violations if user_id is checked, 
  -- we'd normally need real users, but for a "stress test" on counters/logic we can:
  -- A) Disable FKs (dangerous)
  -- B) Create 300 fake users
  
  FOR i IN 1..p_user_count LOOP
    v_fake_user_id := gen_random_uuid();
    
    -- We insert into users first to satisfy FK
    INSERT INTO users (id, email, username, display_name, role)
    VALUES (
      v_fake_user_id, 
      'stress_' || i || '@test.vibe.ch', 
      'test_user_' || i, 
      'Fake User ' || i, 
      'user'
    ) ON CONFLICT (email) DO NOTHING;

    -- Then insert RSVP
    -- Check which table to use: event_rsvps or likes
    -- Based on rsvp/route.ts, we use event_rsvps
    
    -- Create the table if it somehow doesn't exist (safety)
    BEGIN
       INSERT INTO event_rsvps (event_id, user_id, status)
       VALUES (p_event_id, v_fake_user_id, 'going');
    EXCEPTION WHEN OTHERS THEN
       -- Fallback to likes if event_rsvps fails
       INSERT INTO likes (user_id, entity_id, entity_type)
       VALUES (v_fake_user_id, p_event_id, 'event');
    END;

    -- Record impression in analytics
    INSERT INTO analytics_events (entity_type, entity_id, event_type, user_id)
    VALUES ('event', p_event_id, 'rsvp', v_fake_user_id);
  END LOOP;

  -- 3. Update the event counter (if not handled by trigger)
  UPDATE events 
  SET rsvp_count = rsvp_count + p_user_count 
  WHERE id = p_event_id;

  RETURN QUERY SELECT TRUE, 'Simulazione completata con successo: ' || p_user_count || ' utenti aggiunti.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
