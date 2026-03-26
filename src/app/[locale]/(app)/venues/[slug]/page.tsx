import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Link } from '@/lib/i18n/navigation';

import FollowButton from '@/components/social/FollowButton';
import CheckInButton from '@/components/social/CheckInButton';
import CommentThread from '@/components/social/CommentThread';

export const revalidate = 3600; // Static revalidation every hour

/**
 * Pagina profilo venue con dati reali da Supabase.
 */
export default async function VenueDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch della venue tramite slug
  const { data: venue, error } = await supabase
    .from('venues')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !venue) {
    // Se non troviamo per slug, proviamo per ID (fallback)
    const { data: venueById } = await supabase
      .from('venues')
      .select('*')
      .eq('id', slug)
      .single();
    
    if (!venueById) return notFound();
    return VenueDetailRender({ venue: venueById, user });
  }

  return VenueDetailRender({ venue, user });
}

interface Venue {
  id: string;
  name: string;
  address: string;
  slug: string;
  description: string;
  vibe_score: number;
}

async function VenueDetailRender({ venue, user }: { venue: Venue, user: any }) {
  const supabase = await createClient();

  // Verifica se l'utente segue la venue
  let isFollowing = false;
  if (user) {
    const { data: follow } = await supabase
      .from('followers')
      .select('follower_id')
      .match({ 
        follower_id: user.id, 
        following_id: venue.id, 
        entity_type: 'venue' 
      })
      .single();
    isFollowing = !!follow;
  }

  // Fetch affollamento live (ultime 4 ore) tramite RPC
  const { data: liveCrowd } = await supabase
    .rpc('get_venue_crowd', { v_id: venue.id });

  // Fetch eventi in arrivo per questa venue
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('*')
    .eq('venue_id', venue.id)
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Back */}
        <Link href="/explore" className="flex items-center gap-2 text-vibe-text-secondary hover:text-vibe-text mb-4 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <span className="text-sm">Torna a Scopri</span>
        </Link>

        {/* Header / Cover */}
        <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden mb-6 bg-vibe-gradient-subtle">
          <div className="absolute inset-0 bg-gradient-to-t from-vibe-dark via-vibe-dark/40 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl bg-vibe-gradient flex items-center justify-center text-3xl text-white font-bold border-4 border-vibe-dark">
              {venue.name[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-white">{venue.name}</h1>
                <Badge variant="verified">Verificato</Badge>
              </div>
              <p className="text-sm text-white/70">Locale · Zurigo</p>
            </div>
            <div className="hidden sm:flex gap-2">
              <FollowButton 
                targetId={venue.id} 
                entityType="venue" 
                initialIsFollowing={isFollowing} 
                size="sm"
              />
              <CheckInButton venueId={venue.id} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-3 text-center">
            <p className="text-xl font-bold text-amber-400">⭐ {venue.vibe_score || '9.5'}</p>
            <p className="text-xs text-vibe-text-secondary">Vibe Score</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xl font-bold text-vibe-purple">{liveCrowd || 0}</p>
            <p className="text-xs text-vibe-text-secondary">Presenti ora</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xl font-bold text-green-400">● Aperto</p>
            <p className="text-xs text-vibe-text-secondary">Stato</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Colonna principale */}
          <div className="md:col-span-2 space-y-6">
            {/* Info */}
            <Card>
              <h2 className="font-display font-bold text-lg mb-3">Info</h2>
              <p className="text-sm text-vibe-text-secondary leading-relaxed mb-4">{venue.description || 'Benvenuti al ' + venue.name}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Techno</Badge>
                <Badge variant="default">House</Badge>
              </div>
            </Card>

            {/* Eventi */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg">🎉 Prossimi eventi</h2>
                <button className="text-sm text-vibe-purple font-medium">Tutti</button>
              </div>
              <div className="space-y-3">
                {upcomingEvents?.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-vibe-gradient/20 flex items-center justify-center text-lg">
                      🎵
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{event.title}</p>
                      <p className="text-xs text-vibe-text-secondary">
                        {new Date(event.starts_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <Badge variant="default">{event.category || 'Event'}</Badge>
                  </Link>
                ))}
                {!upcomingEvents?.length && (
                  <p className="text-sm text-vibe-text-secondary text-center py-4">Nessun evento in programma.</p>
                )}
              </div>
            </Card>

            {/* Sezione Commenti Live */}
            <Card>
              <CommentThread entityType="venue" entityId={venue.id} />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Orari (Placeholder) */}
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">🕐 Orari</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-vibe-text-secondary">Ven-Sab</span>
                  <span className="text-vibe-text">23:00 - 06:00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-vibe-text-secondary">Dom-Gio</span>
                  <span className="text-red-400">Chiuso</span>
                </div>
              </div>
            </Card>

            {/* Contatti */}
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">📍 Posizione</h3>
              <p className="text-sm text-vibe-text-secondary mb-3">{venue.address || 'Indirizzo non disponibile'}</p>
              <Button variant="secondary" className="w-full text-sm">
                🗺️ Indicazioni
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
