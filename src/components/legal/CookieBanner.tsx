'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { setCookie, getCookie } from '@/lib/utils/cookies';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Verifichiamo il consenso tramite cookie persistente
    const consent = getCookie('vibemeet_consent');
    if (!consent) {
       // Ritardo leggero per non aggredire l'utente al primo caricamento
       const timer = setTimeout(() => setShow(true), 1500);
       return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    // Cookie Persistente (365 giorni)
    setCookie('vibemeet_consent', 'all', 365);
    setCookie('vibemeet_marketing', 'true', 30);
    setCookie('vibemeet_analytics', 'true', 30);
    // Cookie di Sessione (scade alla chiusura del browser)
    setCookie('vibemeet_session_marker', 'active'); 
    setShow(false);
  };

  const handleEssential = () => {
    // Cookie Persistente per ricordarsi la scelta (solo essenziali)
    setCookie('vibemeet_consent', 'essential', 365);
    // NON settiamo marketing/analytics
    setCookie('vibemeet_session_marker', 'active');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-10 md:w-[450px] z-[100] glass-card p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-vibe-purple/20 bg-vibe-dark/95 backdrop-blur-2xl"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-vibe-purple/10 flex items-center justify-center text-vibe-purple shrink-0">
               <Cookie className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-display font-black text-white uppercase tracking-tighter mb-1">Privacy & Vibe</h3>
              <p className="text-sm text-vibe-text-secondary leading-relaxed font-medium">
                Usiamo cookie per rendere la tua esperienza su <span className="text-vibe-purple font-bold">VIBE</span> fluida e sicura. Alcuni sono permanenti, altri durano solo quanto la tua sessione.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
                variant="primary" 
                className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-vibe-purple/20"
                onClick={handleAccept}
            >
              Accetta l'esperienza completa
            </Button>
            <div className="flex gap-3">
              <Button 
                  variant="ghost" 
                  className="flex-1 h-11 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
                  onClick={handleEssential}
              >
                Solo Essenziali
              </Button>
              <Button 
                  variant="outline" 
                  className="flex-1 h-11 rounded-xl text-[10px] font-bold uppercase tracking-widest border-white/5 hover:border-white/10"
                  onClick={() => window.open('/privacy', '_blank')}
              >
                Privacy Policy
              </Button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2">
             <ShieldCheck className="w-3.5 h-3.5 text-vibe-cyan" />
             <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">GDPR Compliant — Security Optimized</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
