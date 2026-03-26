import { createClient } from '@/lib/supabase/server';
import DiscoveryClient from '@/components/discovery/DiscoveryClient';

/* ======= DATA CONSTANTS ======= */
// In production, categories should probably come from i18n json or DB
// For now, we keep them here but we will translate them inside the DiscoveryClient
const categories = [
  { id: 'all', label: 'common.all', icon: '🌟' },
  { id: 'club', label: 'common.club', icon: '🎵' },
  { id: 'bar', label: 'common.bar', icon: '🍸' },
  { id: 'festival', label: 'common.festival', icon: '🎪' },
  { id: 'outdoor', label: 'common.outdoor', icon: '🌿' },
  { id: 'restaurant', label: 'common.food', icon: '🍕' },
  { id: 'art', label: 'common.art', icon: '🎨' },
  { id: 'sport', label: 'common.sport', icon: '⚽' },
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
