'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { 
  Users, 
  Car, 
  QrCode, 
  Settings, 
  TrendingUp, 
  Plus, 
  Calendar, 
  MapPin, 
  ChevronRight,
  ShieldCheck,
  Building2,
  PackageCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/ToastProvider';

export default function BusinessDashboard() {
  const [user, setUser] = useState<any>(null);
  const [venue, setVenue] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'tickets' | 'settings' | 'analytics'>('overview');
  
  const supabase = createClient();
  const router = useRouter();
  const t = useTranslations('dashboard');
  const { showToast } = useToast();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Controllo ruolo (Business only)
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile.role !== 'venue' && profile.role !== 'artist' && profile.role !== 'admin') {
        showToast('Accesso negato: Solo Business Account', 'error');
        router.push('/feed');
        return;
      }

      setUser(profile);

      // Carica venue ed eventi
      const { data: venueData } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', user.id)
        .single();
      
      if (venueData) {
        setVenue(venueData);
        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('venue_id', venueData.id)
          .order('starts_at', { ascending: false });
        setEvents(eventData || []);
      }
      
      setIsLoading(false);
    }
    loadData();
  }, [router, supabase]);

  const updateOccupancy = async (delta: number) => {
    if (!venue) return;
    const newCount = Math.max(0, venue.current_occupancy + delta);
    const { error } = await supabase
      .from('venues')
      .update({ current_occupancy: newCount })
      .eq('id', venue.id);
    
    if (!error) setVenue({ ...venue, current_occupancy: newCount });
  };

  const updateParking = async (delta: number) => {
    if (!venue) return;
    const newCount = Math.max(0, venue.available_parking_spots + delta);
    const { error } = await supabase
      .from('venues')
      .update({ available_parking_spots: newCount })
      .eq('id', venue.id);
    
    if (!error) setVenue({ ...venue, available_parking_spots: newCount });
  };

  if (isLoading) return <div className="min-h-screen bg-vibe-dark flex items-center justify-center"><div className="w-8 h-8 border-t-2 border-vibe-purple rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-vibe-dark text-white pb-24 lg:pb-0 lg:pl-20">
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Header Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <ShieldCheck className="w-5 h-5 text-vibe-purple" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-vibe-purple">Business Hub Control Center</span>
            </div>
            <h1 className="text-4xl font-display font-black vibe-gradient-text uppercase tracking-tighter">
              {venue?.name || 'Your Venue'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" className="rounded-xl border-white/5 bg-white/5">
                <Settings className="w-4 h-4 mr-2" /> {t('settings', { fallback: 'Impostazioni' })}
             </Button>
             <Button variant="primary" className="rounded-xl px-6" onClick={() => router.push('/create?mode=event')}>
                <Plus className="w-4 h-4 mr-2" /> {t('newEvent', { fallback: 'Nuovo Evento' })}
             </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 mb-10 p-1 rounded-2xl bg-white/5 border border-white/5 overflow-x-auto scrollbar-hide">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'events', label: 'Events Management', icon: Calendar },
            { id: 'tickets', label: 'QR Scanner & Tickets', icon: QrCode },
            { id: 'analytics', label: 'Real-time Intelligence', icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-vibe-purple text-white shadow-vibe-purple/20 shadow-lg' 
                  : 'text-vibe-text-secondary hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-6 relative group overflow-hidden border-vibe-purple/30 bg-vibe-purple/5">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-vibe-purple/20 blur-3xl rounded-full group-hover:scale-150 transition-transform"></div>
                <div className="flex items-start justify-between mb-2">
                  <div className="p-3 rounded-2xl bg-vibe-purple/20">
                    <Users className="w-6 h-6 text-vibe-purple" />
                  </div>
                  <Badge variant="live">LIVE</Badge>
                </div>
                <h3 className="text-sm font-bold text-vibe-text-secondary uppercase mb-1">Live Occupancy</h3>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black">{venue?.current_occupancy || 0}</span>
                  <span className="text-vibe-text-secondary mb-1">/ {venue?.total_capacity || '∞'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                   <button onClick={() => updateOccupancy(1)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors font-bold">+</button>
                   <button onClick={() => updateOccupancy(-1)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors font-bold">-</button>
                </div>
              </Card>

              <Card className="p-6 relative group overflow-hidden border-vibe-cyan/30 bg-vibe-cyan/5">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-vibe-cyan/20 blur-3xl rounded-full group-hover:scale-150 transition-transform"></div>
                <div className="flex items-start justify-between mb-2">
                  <div className="p-3 rounded-2xl bg-vibe-cyan/20">
                    <Car className="w-6 h-6 text-vibe-cyan" />
                  </div>
                  <span className="text-[10px] font-bold text-vibe-cyan px-2 py-1 bg-vibe-cyan/10 rounded-full border border-vibe-cyan/20">PARKING</span>
                </div>
                <h3 className="text-sm font-bold text-vibe-text-secondary uppercase mb-1">Available Spots</h3>
                <div className="flex items-end gap-2">
                   <span className="text-4xl font-black">{venue?.available_parking_spots || 0}</span>
                   <span className="text-vibe-text-secondary mb-1">/ {venue?.total_parking_spots || 0}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button onClick={() => updateParking(1)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors font-bold">+</button>
                  <button onClick={() => updateParking(-1)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors font-bold">-</button>
                </div>
              </Card>

              <Card className="p-6">
                <div className="p-3 w-fit rounded-2xl bg-vibe-pink/20 mb-4">
                  <TrendingUp className="w-6 h-6 text-vibe-pink" />
                </div>
                <h3 className="text-sm font-bold text-vibe-text-secondary uppercase mb-1">Revenue (MoM)</h3>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black">CHF 0</span>
                  <Badge variant="default">N/A</Badge>
                </div>
                <p className="text-[10px] text-vibe-text-secondary mt-2">Active campaigns: 0</p>
              </Card>

              <Card className="p-6">
                <div className="p-3 w-fit rounded-2xl bg-vibe-purple/20 mb-4">
                  <QrCode className="w-6 h-6 text-vibe-purple" />
                </div>
                <h3 className="text-sm font-bold text-vibe-text-secondary uppercase mb-1">Active Tickets</h3>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black">0</span>
                  <span className="text-vibe-text-secondary mb-1">Scan pending</span>
                </div>
                <Button size="sm" variant="outline" className="w-full mt-4 h-9" onClick={() => setActiveTab('tickets')}>
                   Launch Scanner
                </Button>
              </Card>
            </div>

            {/* Upcoming Event Snippet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <Card className="p-6 bg-vibe-gradient-subtle border-white/5">
                 <div className="flex items-center justify-between mb-6">
                   <h3 className="font-display font-bold text-lg uppercase tracking-widest flex items-center gap-2">
                     <Calendar className="w-5 h-5 text-vibe-pink" />
                     Prossimi Eventi
                   </h3>
                   <span className="text-vibe-text-secondary text-xs">{events.length} Totali</span>
                 </div>
                 
                 <div className="space-y-4">
                   {events.slice(0, 3).map((event) => (
                     <div key={event.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-vibe-dark flex flex-col items-center justify-center border border-white/10">
                            <span className="text-[10px] font-bold text-vibe-purple uppercase">{new Date(event.starts_at).toLocaleDateString('it-IT', { month: 'short' })}</span>
                            <span className="text-sm font-black">{new Date(event.starts_at).getDate()}</span>
                         </div>
                         <div>
                            <p className="text-sm font-bold group-hover:text-vibe-purple transition-colors">{event.title}</p>
                            <p className="text-xs text-vibe-text-secondary flex items-center gap-1">
                               <PackageCheck className="w-3 h-3" /> {event.tickets_sold || 0} / {event.total_tickets || 'Free'}
                            </p>
                         </div>
                       </div>
                       <ChevronRight className="w-4 h-4 text-vibe-text-secondary group-hover:translate-x-1 transition-transform" />
                     </div>
                   ))}

                   {events.length === 0 && (
                     <div className="p-10 text-center text-vibe-text-secondary border-2 border-dashed border-white/5 rounded-2xl">
                        Aggiungi il tuo primo evento per iniziare a vendere biglietti.
                     </div>
                   )}
                 </div>
               </Card>

               <Card className="p-0 overflow-hidden border-white/5">
                  <div className="p-6">
                    <h3 className="font-display font-bold text-lg uppercase tracking-widest flex items-center gap-2">
                       <MapPin className="w-5 h-5 text-vibe-cyan" />
                       Heatmap Presenza
                    </h3>
                  </div>
                  <div className="h-64 bg-vibe-dark/40 flex items-center justify-center">
                    <div className="text-center opacity-40">
                       <div className="w-12 h-12 rounded-full border-2 border-vibe-cyan border-t-transparent animate-spin mx-auto mb-4"></div>
                       <p className="text-xs uppercase font-bold tracking-widest">Caricamento Intelligence...</p>
                    </div>
                  </div>
               </Card>
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
           <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-6 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="p-8 text-center border-vibe-purple/30 bg-vibe-purple/5">
                  <div className="w-20 h-20 rounded-3xl bg-vibe-gradient mx-auto mb-6 p-0.5 flex items-center justify-center">
                    <div className="w-full h-full rounded-3xl bg-vibe-dark flex items-center justify-center">
                      <QrCode className="w-10 h-10 text-vibe-purple" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-display font-black text-white uppercase tracking-tighter mb-4">Scanner Entry</h2>
                  <p className="text-white/40 text-sm mb-8 px-4">Utilizza la fotocamera per validare i Vibe Pass dei tuoi ospiti in tempo reale.</p>
                  
                  <div className="space-y-3">
                    <Button variant="primary" className="w-full h-14 font-black uppercase tracking-widest" onClick={() => showToast('Scanner attivato (Beta)', 'info')}>
                       ATTIVA FOTOCAMERA
                    </Button>
                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10 text-[10px] text-white/40 uppercase font-bold justify-center">
                       <ShieldCheck className="w-3.5 h-3.5" /> Connessione Criptata E2E
                    </div>
                  </div>
                </Card>

                <Card className="p-8 border-white/5 bg-white/5 flex flex-col">
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-vibe-cyan mb-6">Ultime Scansioni</h3>
                  <div className="flex-1 space-y-4">
                     {[1, 2, 3].map(i => (
                       <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl opacity-40">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-vibe-cyan/20" />
                             <div className="text-left">
                                <p className="text-xs font-bold text-white">Ospite #{i*241}</p>
                                <p className="text-[9px] uppercase font-bold text-white/20">Validato alle 22:1{i}</p>
                             </div>
                          </div>
                          <span className="text-[8px] font-bold border border-green-500/50 text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">SUCCESS</span>
                       </div>
                     ))}
                  </div>
                  <Button variant="ghost" size="sm" className="mt-6 text-[10px] uppercase font-bold tracking-widest text-white/20">Visualizza Tutto lo Storico</Button>
                </Card>
              </div>
           </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Total Reach', val: '12.4K', change: '+14%', color: 'vibe-purple' },
                  { label: 'Engagements', val: '890', change: '+22%', color: 'vibe-cyan' },
                  { label: 'Conversions', val: '3.2%', change: '-2%', color: 'vibe-pink' },
                ].map(stat => (
                  <Card key={stat.label} className={`p-6 border-${stat.color}/30 bg-${stat.color}/5`}>
                     <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">{stat.label}</p>
                     <div className="flex items-end justify-between mt-2">
                        <span className="text-3xl font-black text-white">{stat.val}</span>
                        <span className={`text-xs font-bold ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{stat.change}</span>
                     </div>
                  </Card>
                ))}
             </div>

             <Card className="p-10 border-white/5 bg-white/2 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/img/grid.svg')] opacity-10" />
                <div className="relative z-10 flex flex-col items-center justify-center text-center py-12">
                   <div className="w-16 h-16 rounded-2xl bg-vibe-gradient p-0.5 mb-6 group-hover:rotate-12 transition-transform duration-500">
                      <div className="w-full h-full rounded-2xl bg-vibe-dark flex items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-vibe-purple" />
                      </div>
                   </div>
                   <h3 className="text-2xl font-display font-black text-white uppercase tracking-tighter mb-4">Advanced Insights Incoming</h3>
                   <p className="text-white/40 text-sm max-w-md mx-auto mb-8">Stiamo elaborando il tuo AI-driven audience report. Scoprirai chi sono i tuoi clienti più fedeli e come ottimizzare le tue serate.</p>
                   <Button variant="primary" className="px-10 h-12">Attiva Vibe Pro Intelligence</Button>
                </div>
             </Card>
          </div>
        )}

      </div>
    </div>
  );
}
