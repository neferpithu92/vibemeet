-- ============================================================
-- 037: Global Synchronization & Health Monitoring
-- Schedules the async counter synchronization every 60 seconds.
-- ============================================================

-- 1. Enable pg_cron if not already enabled
-- Note: This requires 'pg_cron' in the preload libraries (standard on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the counter sync
-- Returns the job ID if created
SELECT cron.schedule(
    'sync-sharded-counters-every-min', -- unique name
    '* * * * *',                       -- every minute
    $$ SELECT public.sync_sharded_counters(); $$
);

-- 3. Monitoring View: Shard Health
-- Permette di vedere lo stato degli shard e identificare rige orfane
CREATE OR REPLACE VIEW public.view_counter_shards_health AS
SELECT 
    entity_type, 
    counter_name, 
    count(distinct entity_id) as active_entities,
    sum(count) as total_sharded_count,
    avg(count) as avg_shard_value
FROM public.entity_counters_shards
GROUP BY entity_type, counter_name;
