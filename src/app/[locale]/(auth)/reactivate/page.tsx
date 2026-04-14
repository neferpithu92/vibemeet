'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Rocket, Power, Trash2, Undo2 } from 'lucide-react';

export default function ReactivatePage() {
  const t = useTranslations('settings');
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('display_name, is_paused, deletion_requested_at')
        .eq('id', user.id)
        .single();
      
      setUserData(data);
      setLoading(false);
    }
    loadStatus();
  }, [supabase, router]);

  const handleResume = async () => {
    setIsProcessing(true);
    const { error } = await (supabase.from('users') as any)
      .update({ is_paused: false, deletion_requested_at: null })
      .eq('id', (await supabase.auth.getUser()).data.user?.id);
    
    if (!error) {
      router.push('/map');
      router.refresh();
    }
    setIsProcessing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-20 bg-vibe-dark text-white">Caricamento...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-vibe-dark relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vibe-primary rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vibe-purple rounded-full blur-[100px] animate-pulse-slow" />
      </div>

      <div className="max-w-md w-full glass-card p-8 text-center space-y-8 relative z-10 border-white/20 shadow-2xl scale-in">
        <div className="w-20 h-20 mx-auto bg-vibe-gradient rounded-3xl flex items-center justify-center shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform">
          {userData?.is_paused ? <Power className="w-10 h-10 text-white" /> : <Trash2 className="w-10 h-10 text-white" />}
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white">
            {userData?.is_paused ? t('accountPausedTitle', { fallback: 'Account in Pausa' }) : t('deletionPendingTitle', { fallback: 'Eliminazione in Corso' })}
          </h1>
          <p className="text-vibe-text-secondary">
            {userData?.is_paused 
              ? t('resumePrompt', { fallback: 'Bentornato! Il tuo account è attualmente in pausa. Puoi riattivarlo con un click.' })
              : t('deletionPrompt', { fallback: 'Il tuo account verrà eliminato definitivamente tra meno di 30 giorni. Vuoi annullare la richiesta?' })}
          </p>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={handleResume} 
            disabled={isProcessing}
            className="w-full h-14 rounded-2xl bg-vibe-primary hover:bg-vibe-primary/80 text-lg font-bold flex items-center justify-center gap-3 shadow-xl shadow-vibe-primary/20"
          >
            {isProcessing ? '...' : (
              <>
                <Rocket className="w-5 h-5" />
                {t('resumeAccount', { fallback: 'Riattiva Account' })}
              </>
            )}
          </Button>

          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full text-vibe-text-secondary hover:text-white"
          >
            <Undo2 className="w-4 h-4 mr-2" />
            {t('logout', { fallback: 'Esci e resta disattivato' })}
          </Button>
        </div>

        <p className="text-[10px] text-vibe-text-secondary/50 uppercase tracking-widest font-bold">
          VIBE ACCOUNT LIFECYCLE MANAGEMENT
        </p>
      </div>
    </div>
  );
}
