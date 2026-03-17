import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import Link from 'next/link';
import RSVPButton from '@/components/events/RSVPButton';
import CheckInButton from '@/components/social/CheckInButton';
import CommentThread from '@/components/social/CommentThread';

export const revalidate = 3600; // Static revalidation every hour

/**
 * Pagina dettaglio evento con dati reali da Supabase.
 */
export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch dell'evento con la sua venue associata
  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      venue:venues (*)
    `)
    .eq('id', params.id)
    .single();

  if (error || !event) {
    return notFound();
  }

  // Verifica se l'utente partecipa già
  let isAttending = false;
  if (user) {
    const { data: rsvp } = await supabase
      .from('likes')
      .select('user_id')
      .match({ 
        user_id: user.id, 
        entity_type: 'event', 
        entity_id: params.id 
      })
      .single();
    isAttending = !!rsvp;
  }

  // Demo fallback per campi non ancora presenti nel DB (es. lineup)
  const displayLineup = [
    { name: 'DJ Residende', time: 'Start', headliner: true }
  ];

  return (
    <div className="page-container">
      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Back */}
        <Link href="/events" className="flex items-center gap-2 text-vibe-text-secondary hover:text-vibe-text mb-4 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <span className="text-sm">Torna agli eventi</span>
        </Link>

        {/* Hero/Cover */}
        <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-6 bg-vibe-gradient-subtle">
          <div className="absolute inset-0 bg-gradient-to-t from-vibe-dark via-vibe-dark/50 to-transparent" />
          <div className="absolute top-4 left-4 flex gap-2">
            {new Date(event.end_time) > new Date() && new Date(event.start_time) < new Date() && (
              <Badge variant="live">🔴 LIVE ORA</Badge>
            )}
            <Badge variant="premium">⚡ In evidenza</Badge>
          </div>
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="default">{event.category || 'Music'}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Colonna principale */}
          <div className="md:col-span-2 space-y-6">
            {/* Info cards */}
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
                <p className="text-2xl font-bold text-vibe-pink">CHF {event.ticket_price || 0}</p>
                <p className="text-xs text-vibe-text-secondary">Ingresso</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl">☁️</p>
                <p className="text-xs text-vibe-text-secondary">8°C</p>
              </Card>
            </div>

            {/* Descrizione */}
            <Card>
              <h2 className="font-display font-bold text-lg mb-3">Descrizione</h2>
              <p className="text-sm text-vibe-text-secondary leading-relaxed">{event.description || 'Nessuna descrizione fornita.'}</p>
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

            {/* Sezione Commenti Live */}
            <Card>
              <CommentThread entityType="event" entityId={event.id} />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Azioni */}
            <Card className="p-4">
              <RSVPButton 
                eventId={event.id} 
                initialRsvpCount={event.rsvp_count || 0} 
                initialIsAttending={isAttending} 
              />
              <div className="mt-3">
                <CheckInButton eventId={event.id} />
                <div className="flex gap-2 mt-3">
                  <Button variant="ghost" className="flex-1 text-sm">❤️</Button>
                  <Button variant="ghost" className="flex-1 text-sm">📤</Button>
                  <Button variant="ghost" className="flex-1 text-sm">🔖</Button>
                </div>
              </div>
            </Card>

            {/* Info venue */}
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">📍 Venue</h3>
              <Link href={`/venues/${event.venue?.slug || event.venue?.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all mb-3">
                <Avatar size="md" fallback={event.venue?.name || 'V'} />
                <div>
                  <p className="font-semibold text-sm">{event.venue?.name || 'Venue'}</p>
                  <p className="text-xs text-vibe-text-secondary">{event.venue?.address || 'Indirizzo'}</p>
                </div>
              </Link>
            </Card>

            {/* Data e info */}
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📅</span>
                  <div>
                    <p className="text-sm font-semibold">
                      {new Date(event.start_time).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-xs text-vibe-text-secondary">
                      {new Date(event.start_time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
