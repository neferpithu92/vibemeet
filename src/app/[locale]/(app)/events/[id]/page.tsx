import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Link } from '@/lib/i18n/navigation';
import RSVPButton from '@/components/events/RSVPButton';
import CheckInButton from '@/components/social/CheckInButton';
import CommentThread from '@/components/social/CommentThread';
import { BackButton } from '@/components/ui/BackButton';
import EventCountdown from '@/components/events/EventCountdown';
import EventDetailActions from '@/components/events/EventDetailActions';

export const revalidate = 3600;

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: eventData, error } = await supabase
    .from('events')
    .select('*, venue:venues (*)')
    .eq('id', id)
    .single();

  const event = eventData as any;

  if (error || !event) return notFound();

  let isAttending = false;
  if (user) {
    const { data: rsvp } = await supabase
      .from('event_rsvps')
      .select('id')
      .match({ user_id: user.id, event_id: id })
      .maybeSingle();
    isAttending = !!rsvp;
  }

  const now = new Date();
  const startsAt = new Date(event.starts_at);
  const endsAt = event.ends_at ? new Date(event.ends_at) : null;
  const isLive = startsAt < now && (!endsAt || endsAt > now);
  const isFuture = startsAt > now;

  const displayLineup: { name: string; time: string; headliner: boolean }[] = [
    { name: 'DJ Residente', time: 'Opening', headliner: true }
  ];

  return (
    <div className="page-container">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <BackButton className="!static mb-4" />

        {/* Hero */}
        <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-6">
          {event.cover_url ? (
            <img src={event.cover_url} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-vibe-purple via-vibe-pink to-vibe-cyan" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-vibe-dark via-vibe-dark/40 to-transparent" />
          <div className="absolute top-4 left-4 flex gap-2">
            {isLive && <Badge variant="live">🔴 LIVE ORA</Badge>}
            <Badge variant="premium">⚡ In evidenza</Badge>
          </div>
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="default">{event.category || 'Music'}</Badge>
            </div>
          </div>
        </div>

        {/* Countdown — only for future events */}
        {isFuture && (
          <div className="mb-6">
            <EventCountdown startsAt={event.starts_at} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="md:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-vibe-cyan">{event.actual_crowd || 0}</p>
                <p className="text-xs text-vibe-text-secondary">Presenti ora</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-vibe-purple">{event.rsvp_count || 0}</p>
                <p className="text-xs text-vibe-text-secondary">RSVP</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-vibe-pink">
                  {event.ticket_price ? `CHF ${event.ticket_price}` : 'Free'}
                </p>
                <p className="text-xs text-vibe-text-secondary">Ingresso</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl">{(event.weather_cache as any)?.icon || '☁️'}</p>
                <p className="text-xs text-vibe-text-secondary">
                  {(event.weather_cache as any)?.temp_c ?? '--'}°C
                  {(event.weather_cache as any)?.umbrella ? ' ☂️' : ''}
                </p>
              </Card>
            </div>

            {/* Description */}
            <Card>
              <h2 className="font-display font-bold text-lg mb-3">Descrizione</h2>
              <p className="text-sm text-vibe-text-secondary leading-relaxed">
                {event.description || 'Nessuna descrizione fornita.'}
              </p>
            </Card>

            {/* Lineup */}
            <Card>
              <h2 className="font-display font-bold text-lg mb-4">🎧 Lineup</h2>
              <div className="space-y-3">
                {displayLineup.map((artist, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <Avatar size="md" fallback={artist.name} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{artist.name}</span>
                        {artist.headliner && <Badge variant="premium">Headliner</Badge>}
                      </div>
                      <p className="text-xs text-vibe-text-secondary">{artist.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Comments */}
            <Card>
              <CommentThread entityType="event" entityId={event.id} />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Ticket purchase */}
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">🎟 Biglietti</h3>
              <EventDetailActions
                eventId={event.id}
                eventTitle={event.title}
                ticketPrice={event.ticket_price}
                ticketUrl={event.ticket_url}
              />
            </Card>

            {/* RSVP + Check-in */}
            <Card className="p-4">
              <RSVPButton
                eventId={event.id}
                initialRsvpCount={event.rsvp_count || 0}
                initialIsAttending={isAttending}
                price={event.ticket_price}
                ticketUrl={event.ticket_url}
              />
              <div className="mt-3">
                <CheckInButton eventId={event.id} />
              </div>
            </Card>

            {/* Venue info */}
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">📍 Venue</h3>
              <Link
                href={`/venues/${(event.venue as any)?.slug || (event.venue as any)?.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
              >
                <Avatar size="md" fallback={(event.venue as any)?.name || 'V'} />
                <div>
                  <p className="font-semibold text-sm">{(event.venue as any)?.name || 'Venue'}</p>
                  <p className="text-xs text-vibe-text-secondary">{(event.venue as any)?.address || 'Indirizzo'}</p>
                </div>
              </Link>
            </Card>

            {/* Date */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-lg">📅</span>
                <div>
                  <p className="text-sm font-semibold">
                    {startsAt.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-xs text-vibe-text-secondary">
                    {startsAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
