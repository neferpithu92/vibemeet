'use client';

import { useEffect, useState, use } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, CheckCircle, CreditCard, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const [event, setEvent] = useState<any>(null);
  const [status, setStatus] = useState<'checkout' | 'processing' | 'success'>('checkout');
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchEvent() {
      const { data } = await supabase
        .from('events')
        .select('*, venue:venues(name, address)')
        .eq('id', id)
        .single();
      setEvent(data);
      setIsLoading(false);
    }
    fetchEvent();
  }, [id]);

  const handlePayment = async () => {
    setStatus('processing');
    
    // Simula ritardo transazione
    setTimeout(async () => {
      if (paymentId) {
        // Mocking successful update
        await supabase
          .from('payments')
          .update({ status: 'succeeded' })
          .eq('id', paymentId);
          
        // Mocking RSVP creation
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('likes').insert({
            user_id: user.id,
            entity_type: 'event',
            entity_id: id
          });
        }
      }
      setStatus('success');
    }, 2000);
  };

  if (isLoading || !event) return <div className="page-container flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-t-2 border-vibe-purple rounded-full animate-spin"></div></div>;

  return (
    <div className="page-container flex items-center justify-center p-6 bg-[url('/noise.png')]">
      <div className="w-full max-w-md">
        <BackButton className="mb-4 text-vibe-text-secondary" />

        <AnimatePresence mode="wait">
          {status === 'checkout' && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="p-8 space-y-6 overflow-hidden relative border-vibe-purple/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-vibe-purple/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                
                <div className="text-center">
                  <h1 className="text-3xl font-display font-bold vibe-gradient-text uppercase tracking-tighter mb-1">Completa Checkout</h1>
                  <p className="text-xs text-vibe-text-secondary uppercase tracking-widest">Procedura di pagamento sicura</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-bold text-sm text-white">{event.title}</h2>
                    <span className="text-vibe-purple font-black">CHF {event.ticket_price}</span>
                  </div>
                  <p className="text-xs text-vibe-text-secondary">{event.venue?.name}</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3 text-xs text-vibe-text-secondary">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    Crittografia SSL a 256-bit abilitata
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-vibe-text-secondary tracking-widest">Dati della carta (Mock)</label>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-vibe-dark border border-white/10 text-white/50 cursor-not-allowed">
                       <CreditCard className="w-5 h-5" />
                       <span className="text-sm">4242 4242 4242 4242</span>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="primary" 
                  className="w-full h-14 text-lg font-display uppercase tracking-widest"
                  onClick={handlePayment}
                >
                  Paga Ora CHF {event.ticket_price}
                </Button>

                <p className="text-[9px] text-center text-vibe-text-secondary opacity-40 px-4">
                  Cliccando su "Paga Ora" accetti i termini di servizio e la politica di rimborso di Vibe Platform. Questo è un test di alpha.
                </p>
              </Card>
            </motion.div>
          )}

          {status === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center p-12"
            >
              <div className="w-20 h-20 border-4 border-vibe-purple border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
              <h2 className="text-2xl font-display font-bold uppercase mb-2">Elaborazione...</h2>
              <p className="text-vibe-text-secondary text-sm">Non chiudere questa finestra</p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-24 h-24 bg-green-500 rounded-[2.5rem] p-0.5 mx-auto mb-8 rotate-3 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                <div className="w-full h-full bg-vibe-dark rounded-[2.5rem] flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
              </div>
              <h2 className="text-4xl font-display font-black uppercase vibe-gradient-text">Ticket Confermato!</h2>
              <p className="text-vibe-text-secondary max-w-sm mx-auto">
                Fantastico! Il tuo posto per <b>{event.title}</b> è riservato. Riceverai un codice QR via email o nella sezione "I Miei Tickets".
              </p>
              <div className="pt-8">
                <Button variant="primary" className="w-full h-14" onClick={() => router.push(`/events/${id}`)}>
                   Torna all'evento
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
