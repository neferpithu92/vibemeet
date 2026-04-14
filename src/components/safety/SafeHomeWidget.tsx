'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/ToastProvider';

export default function SafeHomeWidget() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, [supabase]);

  const handleStartSession = async () => {
    if (!userId) {
      showToast('Devi fare l\'accesso per usare Safe Home', 'error');
      return;
    }
    if (!navigator.geolocation) {
       showToast('Geolocalizzazione non supportata', 'error');
       return;
    }

    // 1. Get location
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const { data, error } = await (supabase.from('safe_home_sessions') as any).insert({
        user_id: userId,
        status: 'active',
        start_location: `POINT(${longitude} ${latitude})`,
        last_known_location: `POINT(${longitude} ${latitude})`
      }).select().single();

      if (error || !data) {
         showToast('Errore attivazione Safe Home', 'error');
         return;
      }
      setIsActive(true);
      setSessionId(data.id);
      showToast('Safe Home attivato. I tuoi contatti fidati sono stati avvisati.', 'success');
    });
  };

  const handleConfirmSafe = async () => {
    if (!sessionId) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      await (supabase.from('safe_home_sessions') as any).update({
        status: 'completed',
        end_location: `POINT(${longitude} ${latitude})`,
        ended_at: new Date().toISOString()
      }).eq('id', sessionId);

      setIsActive(false);
      setSessionId(null);
      showToast('Sei arrivato a destinazione. Contatti avvisati.', 'success');
    });
  };

  const handleSOS = async () => {
     if (!sessionId) return;
     await (supabase.from('safe_home_sessions') as any).update({
       status: 'sos_triggered'
     }).eq('id', sessionId);
     showToast('SOS Inviato! Le autorità e i tuoi contatti sono stati allertati.', 'error');
  };

  if (!userId) return null; // Don't show if not logged in

  return (
    <div className="fixed bottom-24 right-4 z-50">
      {!isActive ? (
        <button
          onClick={handleStartSession}
          className="bg-vibe-dark/80 backdrop-blur-md border border-vibe-pink/30 shadow-lg shadow-vibe-pink/20 rounded-full h-14 w-14 flex items-center justify-center text-vibe-pink text-2xl hover:bg-vibe-pink/20 hover:scale-105 transition-all"
          title="Safe Home / Buddy System"
        >
          🛡️
        </button>
      ) : (
        <div className="bg-vibe-dark/95 border border-red-500/50 shadow-2xl p-4 rounded-2xl flex flex-col gap-3 min-w-[200px] animate-fade-in">
           <p className="text-sm font-bold text-center text-white flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Safe Home Attivo
           </p>
           <Button onClick={handleConfirmSafe} className="bg-vibe-green/20 text-vibe-green border border-vibe-green/40 hover:bg-vibe-green/30">
              Sono a Casa
           </Button>
           <Button onClick={handleSOS} className="bg-red-500/20 text-red-500 border border-red-500/40 hover:bg-red-500/30">
              🚨 SOS Emergenza
           </Button>
        </div>
      )}
    </div>
  );
}
