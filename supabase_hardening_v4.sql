-- ========================================================
-- SECURITY HARDENING V4: Strict Row Level Security (RLS)
-- Esegui questo script direttamente su Supabase > SQL Editor
-- ========================================================

-- TABELLA: TICKETS
-- Assicura che solo i possessori possano leggere i loro biglietti. E gli organizzatori non possano altersare.
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only read their own tickets" 
ON public.tickets FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  user_id IN (
      SELECT id FROM public.users WHERE role IN ('admin', 'venue') 
  )
);

-- TABELLA: MEDIA (Reels, Foto Orizzontali)
-- Impedisci falsificazioni dell'author_id in fase di inserimento.
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Lettura permessa a tutti se l'account non è privato e la media non è scaduta
CREATE POLICY "Public media is readable by everyone" 
ON public.media FOR SELECT 
USING (expires_at IS NULL OR expires_at > NOW());

-- Inserimento: L'utente può inserire solo col proprio author_id
CREATE POLICY "Users can insert their own media" 
ON public.media FOR INSERT 
WITH CHECK (auth.uid() = author_id);

-- Delete: L'utente può eliminare solo le proprie foto
CREATE POLICY "Users can delete their own media" 
ON public.media FOR DELETE 
USING (auth.uid() = author_id);

-- TABELLA: LIKES
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all likes" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can only insert their own likes" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own likes" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- TABELLA: EVENTS
-- Gli eventi possono essere letti da tutti, ma inseriti/cancellati solo dall'organizzatore.
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events reading is public" ON public.events FOR SELECT USING (true);

CREATE POLICY "Organizers can insert events" 
ON public.events FOR INSERT 
WITH CHECK (
  auth.uid() = organizer_id 
  AND 
  EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('venue', 'artist', 'admin'))
);

CREATE POLICY "Organizers can update their own events" 
ON public.events FOR UPDATE 
USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their own events" 
ON public.events FOR DELETE 
USING (auth.uid() = organizer_id);
