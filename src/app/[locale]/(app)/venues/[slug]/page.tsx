import { createClient } from '@/lib/supabase/server';
import VenueClient from './VenueClient';
import { notFound } from 'next/navigation';

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: venue, error } = await supabase
    .from('venues')
    .select('*')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .single();

  if (error || !venue) return notFound();

  // Live check-ins at this venue
  const { data: currentCrowd } = await supabase
    .from('check_ins')
    .select(`
      user_id,
      created_at,
      users:user_id (id, username, display_name, avatar_url)
    `)
    .eq('venue_id', venue.id)
    .gte('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  // Upcoming events at this venue
  const { data: events } = await supabase
    .from('events')
    .select('id, title, starts_at, cover_url, rsvp_count, ticket_price')
    .eq('venue_id', venue.id)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(5);

  // Weather for venue location
  let weather = null;
  if (venue.latitude && venue.longitude) {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${venue.latitude}&longitude=${venue.longitude}&hourly=temperature_2m,precipitation_probability,weathercode&timezone=Europe/Zurich&forecast_days=1`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const d = await res.json();
        const code = d.hourly?.weathercode?.[new Date().getHours()] || 0;
        const icons: Record<number, string> = { 0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️', 61: '🌧', 63: '🌧', 80: '🌦', 95: '⛈' };
        weather = {
          temp_c: Math.round(d.hourly?.temperature_2m?.[new Date().getHours()] || 0),
          rain_pct: d.hourly?.precipitation_probability?.[new Date().getHours()] || 0,
          icon: icons[code] || '🌡️'
        };
      }
    } catch {}
  }

  return (
    <VenueClient
      venue={venue}
      currentCrowd={(currentCrowd || []) as any[]}
      upcomingEvents={(events || []) as any[]}
      weather={weather}
      currentUserId={user?.id}
    />
  );
}
