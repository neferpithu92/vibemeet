-- ============================================================
-- 028: Heatmap Points RPC with Privacy Controls
-- Calculates active heatmap points respecting user_settings radius
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_heatmap_points(
  sw_lon FLOAT,
  sw_lat FLOAT,
  ne_lon FLOAT,
  ne_lat FLOAT,
  hours_back INT DEFAULT 4
)
RETURNS TABLE (
  longitude FLOAT,
  latitude FLOAT,
  weight FLOAT
) AS $$
BEGIN
  RETURN QUERY
  
  -- 1. Check-in Points (with privacy rounding)
  SELECT 
    CASE 
      WHEN us.location_radius = 'city' THEN ROUND(c.longitude::NUMERIC * 10) / 10
      WHEN us.location_radius = '500m' THEN ROUND(c.longitude::NUMERIC * 200) / 200
      ELSE ROUND(c.longitude::NUMERIC * 1000) / 1000 -- 100m default
    END AS longitude,
    CASE 
      WHEN us.location_radius = 'city' THEN ROUND(c.latitude::NUMERIC * 10) / 10
      WHEN us.location_radius = '500m' THEN ROUND(c.latitude::NUMERIC * 200) / 200
      ELSE ROUND(c.latitude::NUMERIC * 1000) / 1000 -- 100m default
    END AS latitude,
    0.6::FLOAT AS weight
  FROM public.check_ins c
  JOIN public.user_settings us ON us.user_id = c.user_id
  WHERE 
    c.created_at >= NOW() - (hours_back || ' hours')::INTERVAL
    AND c.latitude IS NOT NULL 
    AND c.longitude IS NOT NULL
    AND c.longitude >= sw_lon AND c.longitude <= ne_lon
    AND c.latitude >= sw_lat AND c.latitude <= ne_lat
    AND COALESCE(us.location_radius, '500m') != 'off' -- Exclude users in stealth mode

  UNION ALL

  -- 2. Venues (ambient heat)
  SELECT 
    v.longitude,
    v.latitude,
    1.0::FLOAT AS weight
  FROM public.venues v
  WHERE 
    v.latitude IS NOT NULL 
    AND v.longitude IS NOT NULL
    AND v.longitude >= sw_lon AND v.longitude <= ne_lon
    AND v.latitude >= sw_lat AND v.latitude <= ne_lat;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
