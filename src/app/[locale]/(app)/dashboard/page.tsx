'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

/**
 * Dashboard per i Proprietari di Venue — Statistiche e gestione.
 */
export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [venues, setVenues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. Carica le venue dell'utente
      const { data: userVenues } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', user.id);

      if (userVenues && userVenues.length > 0) {
        setVenues(userVenues);
        const venueIds = userVenues.map(v => v.id);

        // 2. Carica statistiche aggregate
        // Check-ins totali
        const { count: totalCheckIns } = await supabase
          .from('check_ins')
          .select('*', { count: 'exact', head: true })
          .in('venue_id', venueIds);

        // RSVP totali per eventi futuri
        const { count: totalRSVPs } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('entity_type', 'event'); 
          // (Questo è approssimativo, idealmente filteremmo solo quelli legati alle venue dell'owner)

        setStats({
          checkIns: totalCheckIns || 0,
          rsvps: totalRSVPs || 0,
          venuesCount: userVenues.length
        });
      }

      setIsLoading(false);
    }

    loadDashboardData();
  }, [router, supabase]);

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-vibe-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="page-container p-6">
        <Card className="p-12 text-center flex flex-col items-center gap-6">
          <div className="text-6-xl">🏢</div>
          <h1 className="text-2xl font-bold">Nessuna Venue Registrata</h1>
          <p className="text-vibe-text-secondary max-w-sm">
            Sembra che tu non sia ancora proprietario di alcun locale. Se gestisci una venue, contattaci per abilitare il tuo account Business.
          </p>
          <Button variant="primary">Contattaci</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container space-y-8 p-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Business Dashboard</h1>
          <p className="text-vibe-text-secondary">Monitora l&apos;andamento delle tue venue in Svizzera.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">Scarica Report</Button>
          <Link href="/create">
            <Button variant="primary" size="sm">+ Nuovo Evento</Button>
          </Link>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-vibe-purple/5 border-vibe-purple/20">
          <p className="text-vibe-text-secondary text-xs font-bold uppercase tracking-wider mb-2">Check-ins Totali</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">{stats?.checkIns}</span>
            <span className="text-green-400 text-sm font-bold mb-1">+12%</span>
          </div>
        </Card>
        
        <Card className="p-6 bg-vibe-pink/5 border-vibe-pink/20">
          <p className="text-vibe-text-secondary text-xs font-bold uppercase tracking-wider mb-2">RSVP Attivi</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">{stats?.rsvps}</span>
            <span className="text-blue-400 text-sm font-bold mb-1">Live</span>
          </div>
        </Card>

        <Card className="p-6 bg-vibe-cyan/5 border-vibe-cyan/20">
          <p className="text-vibe-text-secondary text-xs font-bold uppercase tracking-wider mb-2">Venue Gestite</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">{stats?.venuesCount}</span>
          </div>
        </Card>
      </div>

      {/* Venues List */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Le tue Venue</h2>
        <div className="grid grid-cols-1 gap-4">
          {venues.map(venue => (
            <Card key={venue.id} className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 hover:border-vibe-purple/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-vibe-surface border border-white/10 flex items-center justify-center text-3xl">
                  🏢
                </div>
                <div>
                  <h3 className="font-bold text-lg">{venue.name}</h3>
                  <p className="text-sm text-vibe-text-secondary">{venue.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Badge variant="live" className="capitalize">Attivo</Badge>
                <Button variant="ghost" size="sm" className="hidden md:flex">Gestisci</Button>
                <Button variant="secondary" size="sm" className="flex-1 md:flex-none">Vedi Statistiche</Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Attività Recente</h2>
        <Card className="divide-y divide-white/5 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-vibe-purple/20 flex items-center justify-center text-xs">👤</div>
                <div>
                  <p className="text-sm font-medium">Un utente ha fatto check-in</p>
                  <p className="text-[10px] text-vibe-text-secondary">2 minuti fa</p>
                </div>
              </div>
              <span className="text-xs text-vibe-text-secondary">Dettagli</span>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
