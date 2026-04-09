'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';

export default function TicketsPage() {
  const t = useTranslations('Tickets');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchTickets() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('tickets')
        .select(`
          id, qr_code, status, purchased_at,
          event:events(id, title, date)
        `)
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false });

      if (data) setTickets(data);
      setLoading(false);
    }
    fetchTickets();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <div className="skeleton w-12 h-12 rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-display font-bold text-vibe-text">My Wallet</h1>
      
      {tickets.length === 0 ? (
        <div className="text-vibe-text-secondary">No tickets found. Explora eventi per acquistarne!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tickets.map(ticket => (
            <div key={ticket.id} className="glass-card p-6 flex flex-col items-center space-y-4">
              <h2 className="text-xl font-bold">{ticket.event?.title || 'Evento Misterioso'}</h2>
              <div className="bg-white p-4 rounded-xl">
                {ticket.qr_code ? (
                   <QRCodeSVG value={ticket.qr_code} size={150} level="H" />
                ) : (
                   <span className="text-black">No QR</span>
                )}
              </div>
              <div className="text-center">
                <span className={`badge ${ticket.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {ticket.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
