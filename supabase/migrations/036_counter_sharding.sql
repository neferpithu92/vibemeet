-- ============================================================
-- 036: High-Throughput Counter Sharding
-- Prevents row-level locking on main entities during viral events.
-- ============================================================

BEGIN;

-- 1. Tabella Shards per distribuire le scritture
CREATE TABLE IF NOT EXISTS public.entity_counters_shards (
    entity_id     UUID NOT NULL,
    entity_type   TEXT NOT NULL,
    counter_name  TEXT NOT NULL, -- 'like', 'view', 'comment'
    shard_index   INTEGER NOT NULL, -- 0-9 per default
    count         BIGINT DEFAULT 0,
    PRIMARY KEY (entity_id, entity_type, counter_name, shard_index)
);

-- Index per velocizzare l'aggregazione
CREATE INDEX IF NOT EXISTS idx_counter_shards_entity 
ON public.entity_counters_shards(entity_id, entity_type);

-- 2. Funzione per incrementare un contatore sharded (Atomic & Low Contention)
CREATE OR REPLACE FUNCTION public.increment_sharded_counter(
    p_entity_id UUID,
    p_entity_type TEXT,
    p_counter_name TEXT,
    p_increment INTEGER DEFAULT 1
) RETURNS VOID AS $$
DECLARE
    v_shard_index INTEGER;
BEGIN
    -- Seleziona uno shard casuale tra 0 e 9
    v_shard_index := floor(random() * 10)::INTEGER;

    INSERT INTO public.entity_counters_shards (entity_id, entity_type, counter_name, shard_index, count)
    VALUES (p_entity_id, p_entity_type, p_counter_name, v_shard_index, p_increment)
    ON CONFLICT (entity_id, entity_type, counter_name, shard_index)
    DO UPDATE SET count = public.entity_counters_shards.count + p_increment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Aggiorna il trigger dei Like per usare lo sharding
CREATE OR REPLACE FUNCTION public.after_like_aff_and_count()
RETURNS TRIGGER AS $$
DECLARE
    v_author_id UUID;
BEGIN
    -- 3.1 Determina l'autore e incrementa lo shard (NON la riga principale)
    IF (NEW.entity_type = 'media') THEN
        SELECT user_id INTO v_author_id FROM public.media WHERE id = NEW.entity_id;
        PERFORM public.increment_sharded_counter(NEW.entity_id, 'media', 'like', 1);
    ELSIF (NEW.entity_type = 'event') THEN
        SELECT creator_id INTO v_author_id FROM public.events WHERE id = NEW.entity_id;
        PERFORM public.increment_sharded_counter(NEW.entity_id, 'event', 'like', 1);
    END IF;

    -- 3.2 Affinità rimane diretta (scrittura singola per utente, meno contention)
    IF v_author_id IS NOT NULL THEN
        PERFORM public.update_user_affinity(NEW.user_id, v_author_id, 2.0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Funzione di Sincronizzazione Batch (Eventual Consistency)
--    Sincronizza i totali dagli shard alle tabelle principali.
CREATE OR REPLACE FUNCTION public.sync_sharded_counters()
RETURNS VOID AS $$
BEGIN
    -- Sincronizza Likes su Media
    UPDATE public.media m
    SET like_count = (
        SELECT COALESCE(SUM(count), 0)
        FROM public.entity_counters_shards s
        WHERE s.entity_id = m.id AND s.entity_type = 'media' AND s.counter_name = 'like'
    )
    WHERE id IN (
        SELECT DISTINCT entity_id 
        FROM public.entity_counters_shards 
        WHERE entity_type = 'media'
    );

    -- Sincronizza Views su Media
    UPDATE public.media m
    SET view_count = (
        SELECT COALESCE(SUM(count), 0)
        FROM public.entity_counters_shards s
        WHERE s.entity_id = m.id AND s.entity_type = 'media' AND s.counter_name = 'view'
    )
    WHERE id IN (
        SELECT DISTINCT entity_id 
        FROM public.entity_counters_shards 
        WHERE entity_type = 'media'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Aggiorna process_batch_interactions per usare lo sharding per le views
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
            
            -- Usa sharding per incrementare view_count
            PERFORM public.increment_sharded_counter((v_item->>'post_id')::UUID, 'media', 'view', 1);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
