-- ============================================================
-- 029: DB Audit Logs (Tracciamento Sicurezza Fort Knox)
-- Logs sensitive actions (blocklists, settings changes)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Nessuno può eliminare dal log. Solo insert e read (admin).
-- (Implementazione base per la sicurezza)
CREATE POLICY audit_logs_insert ON public.audit_logs 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- Trigger Function per loggare i blocchi utente
CREATE OR REPLACE FUNCTION log_user_block()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action_type, entity_id, details)
    VALUES (NEW.blocker_id, 'USER_BLOCKED', NEW.blocked_id::text, json_build_object('blocked_at', NEW.created_at));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_user_block ON public.user_blocks;
CREATE TRIGGER trg_audit_user_block
    AFTER INSERT ON public.user_blocks
    FOR EACH ROW
    EXECUTE FUNCTION log_user_block();
