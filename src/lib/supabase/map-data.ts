import { createClient } from './server';
import type { Database } from '@/types/database';

type Venue = Database['public']['Tables']['venues']['Row'];
type Event = Database['public']['Tables']['events']['Row'];

/**
 * Recupera le Venue all'interno di un'area geografica (bounding box).
 * Usa le coordinate SW (South-West) e NE (North-East).
 */
export async function getVenuesInBounds(sw: [number, number], ne: [number, number]) {
  const supabase = await createClient();

  // Query geografica: st_makeenvelope(xmin, ymin, xmax, ymax, srid)
  // Per ora facciamo una query semplice sulle colonne lat/lon
  // NOTA: In produzione useremo PostGIS ST_Intersects o ST_DWithin
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .gte('longitude', sw[0])
    .lte('longitude', ne[0])
    .gte('latitude', sw[1])
    .lte('latitude', ne[1]);

  if (error) {
    console.error('Errore recupero venue:', error);
    return [];
  }

  return data;
}

/**
 * Recupera gli Eventi attivi all'interno di un'area geografica.
 */
export async function getEventsInBounds(sw: [number, number], ne: [number, number]) {
  const supabase = await createClient();

  // Fetch eventi uniti alle venue per avere la posizione
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      venue:venues!inner(*)
    `)
    .gte('venue.longitude', sw[0])
    .lte('venue.longitude', ne[0])
    .gte('venue.latitude', sw[1])
    .lte('venue.latitude', ne[1])
    .gte('end_time', new Date().toISOString());

  if (error) {
    console.error('Errore recupero eventi:', error);
    return [];
  }

  return data;
}
