-- ============================================================
-- 038: Atomic Delta-Buffering & High-Frequency Sharding
-- Refactors sharding to use Atomic CTE (DELETE ... RETURNING)
-- ============================================================

BEGIN;

-- 1. Refactoring Schema: Passaggio a colonne per contatore (maggiore efficienza batch)
--    Cancelliamo la vecchia tabella e ricreiamo con lo schema ottimizzato.
DROP TABLE IF EXISTS public.entity_counters_shards CASCADE;

CREATE TABLE public.entity_counters_shards (
    entity_id     UUID NOT NULL,
    entity_type   TEXT NOT NULL,
    shard_index   INTEGER NOT NULL,
    likes_count   INTEGER DEFAULT 0,
    views_count   INTEGER DEFAULT 0,
    PRIMARY KEY (entity_id, entity_type, shard_index)
);

CREATE INDEX idx_counter_shards_entity_v2 ON public.entity_counters_shards(entity_id, entity_type);

-- 2. Aggiornamento Funzione Incremenent (Atomic Delta Buffer)
CREATE OR REPLACE FUNCTION public.increment_sharded_counter_v2(
    p_entity_id UUID,
    p_entity_type TEXT,
    p_likes_inc INTEGER DEFAULT 0,
    p_views_inc INTEGER DEFAULT 0
) RETURNS VOID AS $$
DECLARE
    v_shard_index INTEGER;
BEGIN
    v_shard_index := floor(random() * 10)::INTEGER;

    INSERT INTO public.entity_counters_shards (entity_id, entity_type, shard_index, likes_count, views_count)
    VALUES (p_entity_id, p_entity_type, v_shard_index, p_likes_inc, p_views_inc)
    ON CONFLICT (entity_id, entity_type, shard_index)
    DO UPDATE SET 
        likes_count = public.entity_counters_shards.likes_count + p_likes_inc,
        views_count = public.entity_counters_shards.views_count + p_views_inc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Sostituzione delle chiamate nelle vecchie funzioni
CREATE OR REPLACE FUNCTION public.after_like_aff_and_count()
RETURNS TRIGGER AS $$
DECLARE
    v_author_id UUID;
BEGIN
    IF (NEW.entity_type = 'media') THEN
        SELECT user_id INTO v_author_id FROM public.media WHERE id = NEW.entity_id;
        PERFORM public.increment_sharded_counter_v2(NEW.entity_id, 'media', 1, 0);
    ELSIF (NEW.entity_type = 'event') THEN
        SELECT creator_id INTO v_author_id FROM public.events WHERE id = NEW.entity_id;
        PERFORM public.increment_sharded_counter_v2(NEW.entity_id, 'event', 1, 0);
    END IF;

    IF v_author_id IS NOT NULL THEN
        PERFORM public.update_user_affinity(NEW.user_id, v_author_id, 2.0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.process_batch_interactions(p_interactions JSONB)
RETURNS VOID AS $$
DECLARE
    v_item JSONB;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_interactions)
    LOOP
        INSERT INTO public.user_interactions (user_id, post_id, interaction_type, watch_time_sec)
        VALUES (
            (v_item->>'user_id')::UUID,
            (v_item->>'post_id')::UUID,
            v_item->>'type',
            COALESCE((v_item->>'watch_time')::INTEGER, 0)
        );

        IF (v_item->>'type' = 'view') THEN
            PERFORM public.update_user_affinity(
                (v_item->>'user_id')::UUID,
                (v_item->>'author_id')::UUID,
                COALESCE((v_item->>'affinity_inc')::DECIMAL, 0.1)
            );
            
            PERFORM public.increment_sharded_counter_v2((v_item->>'post_id')::UUID, 'media', 0, 1);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Funzione di Sincronizzazione Atomica (Proposta GEM-Core Alpha)
CREATE OR REPLACE FUNCTION public.sync_sharded_counters_v2()
RETURNS VOID AS $$
DECLARE
    row RECORD;
BEGIN
    FOR row IN 
        WITH deleted_shards AS (
            DELETE FROM public.entity_counters_shards
            RETURNING entity_id, entity_type, likes_count, views_count
        )
        SELECT 
            entity_id, 
            entity_type, 
            SUM(likes_count) as total_likes, 
            SUM(views_count) as total_views
        FROM deleted_shards
        GROUP BY entity_id, entity_type
    LOOP
        IF row.entity_type = 'media' THEN
            UPDATE public.media 
            SET 
                like_count = public.media.like_count + row.total_likes, -- Allineamento nomi: like_count
                view_count = public.media.view_count + row.total_views, -- Allineamento nomi: view_count
                updated_at = now()
            WHERE id = row.entity_id;
        ELSIF row.entity_type = 'event' THEN
            UPDATE public.events 
            SET 
                view_count = public.events.view_count + row.total_views,
                updated_at = now()
            WHERE id = row.entity_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Riprogrammazione pg_cron
-- Rimuoviamo il vecchio job
SELECT cron.unschedule('sync-sharded-counters-every-min');

-- Scheduliamo il nuovo job ad alta frequenza (10s)
SELECT cron.schedule(
    'sync-counters-high-freq', 
    '10 seconds', 
    'SELECT public.sync_sharded_counters_v2()'
);

-- 6. Aggiornamento View Monitoring (GEM-Core Alpha Audit)
CREATE OR REPLACE VIEW public.view_counter_shards_health AS
SELECT 
    entity_type, 
    count(distinct entity_id) as active_entities,
    sum(likes_count) as total_likes_pending,
    sum(views_count) as total_views_pending
FROM public.entity_counters_shards
GROUP BY entity_type;

COMMIT;
