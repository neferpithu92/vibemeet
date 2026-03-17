import { createClient } from '@/lib/supabase/server';
import EventsClient from '@/components/events/EventsClient';
import { getTranslations } from 'next-intl/server';

export const revalidate = 3600; // ISR: Revalidate every hour

/**
 * Pagina listing eventi — Server Component che recupera dati reali da Supabase.
 */
export default async function EventsPage() {
  const t = await getTranslations('events');
  const supabase = await createClient();

  // Fetch degli eventi futuri con le relative venue
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      *,
      venue:venues (*)
    `)
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error);
  }

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <EventsClient initialEvents={events || []} />
      </div>
    </div>
  );
}
