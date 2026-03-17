import { createClient } from '@/lib/supabase/server';
import DiscoveryClient from '@/components/discovery/DiscoveryClient';

/* ======= DATA CONSTANTS ======= */
const categories = [
  { id: 'all', label: 'Tutto', icon: '🌟' },
  { id: 'club', label: 'Club', icon: '🎵' },
  { id: 'bar', label: 'Bar', icon: '🍸' },
  { id: 'festival', label: 'Festival', icon: '🎪' },
  { id: 'outdoor', label: 'All\'aperto', icon: '🌿' },
  { id: 'restaurant', label: 'Cibo', icon: '🍕' },
  { id: 'art', label: 'Arte', icon: '🎨' },
  { id: 'sport', label: 'Sport', icon: '⚽' },
];

/**
 * Pagina Esplora — Server Component per il fetching dei dati reali.
 */
export default async function ExplorePage() {
  const supabase = await createClient();

  // Fetch delle venue (limite 20 per ora)
  const { data: venues } = await supabase
    .from('venues')
    .select('*')
    .limit(20);

  // Fetch degli eventi in tendenza (prossimi 3 eventi)
  const { data: events } = await supabase
    .from('events')
    .select(`
      *,
      venue:venues (*)
    `)
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(3);

  return (
    <div className="page-container">
      <DiscoveryClient 
        venues={venues || []} 
        events={events || []} 
        categories={categories} 
      />
    </div>
  );
}
