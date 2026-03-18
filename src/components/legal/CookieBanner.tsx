'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('vibemeet_cookie_consent');
    if (!consent) setShow(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('vibemeet_cookie_consent', 'all');
    setShow(false);
  };

  const handleEssential = () => {
    localStorage.setItem('vibemeet_cookie_consent', 'essential');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-vibe-dark border-t border-white/10 p-4 md:p-6 shadow-2xl animate-fade-in">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">🍪 Utilizzo dei Cookie</h3>
          <p className="text-sm text-vibe-text-secondary">
            Utilizziamo cookie essenziali per il funzionamento della piattaforma e cookie di terze parti per misurazione e personalizzazione.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
          <Button variant="outline" className="flex-1 md:flex-none text-xs py-2" onClick={handleEssential}>
            Solo Essenziali
          </Button>
          <Button className="flex-1 md:flex-none text-xs py-2" onClick={handleAccept}>
            Accetta Tutti
          </Button>
        </div>
      </div>
    </div>
  );
}
