'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Ticket {
  id: string;
  qr_code: string;
  status: string;
  events?: {
    title: string;
    location_name: string;
    start_time: string;
    cover_image: string | null;
  };
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const supabase = createClient();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTicket() {
      const { data } = await supabase
        .from('tickets')
        .select(`
          *,
          events (
            title,
            location_name,
            start_time,
            cover_image
          )
        `)
        .eq('id', id as string)
        .single();
      
      if (data) setTicket(data as unknown as Ticket);
      setLoading(false);
    }
    fetchTicket();
  }, [id, supabase]);

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-20">Caricamento...</div>;
  if (!ticket) return <div className="min-h-screen flex items-center justify-center pt-20 text-vibe-text-secondary">Biglietto non trovato.</div>;

  return (
    <div className="min-h-screen pt-24 px-4 max-w-2xl mx-auto">
      <Card className="overflow-hidden bg-vibe-dark/40 border-white/10 backdrop-blur-xl">
        <div className="h-48 relative">
          {ticket.events?.cover_image ? (
            <img src={ticket.events.cover_image} alt="Event" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-vibe-purple/20 flex items-center justify-center">
              <span className="text-5xl">🎫</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-vibe-dark to-transparent" />
          <div className="absolute bottom-4 left-6">
            <h1 className="text-2xl font-bold text-white">{ticket.events?.title}</h1>
          </div>
        </div>

        <div className="p-8 flex flex-col items-center">
          <div className="bg-white p-4 rounded-3xl mb-6 shadow-2xl shadow-vibe-purple/20">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticket.qr_code}`} 
              alt="Ticket QR" 
              className="w-48 h-48"
            />
          </div>

          <div className="text-center mb-8">
            <p className="text-vibe-text-secondary uppercase tracking-widest text-xs font-bold mb-1">Codice Biglietto</p>
            <p className="text-xl font-mono text-white">{ticket.id.split('-')[0].toUpperCase()}</p>
          </div>

          <div className="w-full space-y-4 mb-8">
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-vibe-text-secondary">Stato</span>
              <span className={`font-bold ${ticket.status === 'valid' ? 'text-vibe-green' : 'text-red-400'}`}>
                {ticket.status === 'valid' ? 'VALIDO' : 'NON VALIDO'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-vibe-text-secondary">Data</span>
              <span className="text-white">
                {ticket.events?.start_time ? new Date(ticket.events.start_time).toLocaleDateString('it-IT') : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-vibe-text-secondary">Location</span>
              <span className="text-white">{ticket.events?.location_name || 'Da confermare'}</span>
            </div>
          </div>

          <Button variant="secondary" className="w-full" onClick={() => window.print()}>
            Scarica PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}
