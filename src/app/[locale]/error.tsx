'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log in background to an observability service in production
    console.error('Route segment breakdown:', error);
  }, [error]);

  return (
    <div className="flex-1 w-full h-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-vibe-purple/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(124,58,237,0.3)]">
        <span className="text-4xl animate-bounce">🛠️</span>
      </div>
      <h2 className="text-2xl font-black font-display mb-3">Imprevisto Tecnico</h2>
      <p className="text-vibe-text-secondary max-w-sm mb-8">
        Ops! Questo modulo dell'applicazione ha interrotto le comunicazioni col server. Riprova o torna alla Home.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => window.location.href = '/'} variant="outline" className="border-white/10">
          Torna alla Vibe
        </Button>
        <Button onClick={() => reset()} className="bg-vibe-gradient">
          Ricarica Componente
        </Button>
      </div>
    </div>
  );
}
