'use client';

import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

export default function OrganizerScannerPage() {
  const t = useTranslations('Tickets');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; event?: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    async function checkPremiumAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setHasAccess(false);

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (!userData || (userData.role !== 'venue' && userData.role !== 'artist' && userData.role !== 'admin')) {
        return setHasAccess(false);
      }

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('entity_id', user.id)
        .eq('status', 'active')
        .single();
        
      if (userData.role === 'admin' || (sub && (sub.plan === 'premium' || sub.plan === 'enterprise'))) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    }
    
    checkPremiumAccess();
  }, []);

  const handleScan = async (text: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setScanResult(null);

    try {
      const res = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: text }),
      });
      
      const data = await res.json();
      
      if (data.valid) {
        setScanResult({ success: true, message: 'BIGLIETTO VALIDO!', event: data.ticket?.event_title });
      } else {
        setScanResult({ success: false, message: data.reason || 'BIGLIETTO RIFIUTATO' });
      }
    } catch (err) {
      setScanResult({ success: false, message: 'Errore di connessione' });
    }

    setTimeout(() => {
      setIsProcessing(false);
      setScanResult(null);
    }, 4000);
  };

  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <div className="skeleton w-16 h-16 rounded-full" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center space-y-6 pt-20">
        <div className="w-20 h-20 bg-vibe-dark rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_40px_rgba(236,72,153,0.3)]">
           <span className="text-4xl">🔐</span>
        </div>
        <h1 className="text-3xl font-display font-bold">Premium Required</h1>
        <p className="text-vibe-text-secondary max-w-md">
          Per utilizzare lo scanner all'ingresso dei tuoi eventi e gestire i biglietti è necessario un abbonamento <strong>Vibe Premium</strong>.
        </p>
        <button className="btn-primary" onClick={() => window.location.href = '/pricing'}>
          Upgrade to Premium
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">Door Scanner</h1>
      
      <div className="rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 relative bg-black">
        <Scanner 
          onScan={(result) => {
            if (result && result.length > 0) {
              handleScan(result[0].rawValue);
            }
          }}
          components={{
             audio: false,
             finder: true,
          }}
          formats={['qr_code']}
        />
        
        {isProcessing && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-vibe-pink border-t-transparent" />
          </div>
        )}
      </div>

      {scanResult && (
        <div className={`p-4 rounded-xl text-center font-bold text-lg animate-in slide-in-from-bottom ${
          scanResult.success ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
        }`}>
          <div>{scanResult.message}</div>
          {scanResult.event && <div className="text-sm font-normal opacity-80 mt-1">{scanResult.event}</div>}
        </div>
      )}
    </div>
  );
}
