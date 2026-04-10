'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from '@/lib/i18n/navigation';

/**
 * Componente per gestire le transizioni fluide tra le pagine.
 * Utilizza Framer Motion per un effetto fade-in + slide-up.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = useLocale();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Se non siamo ancora sul client, renderizziamo il contenuto "nudo" 
  // senza motion.div per garantire la coerenza HTML con il server.
  if (!isMounted) {
    return <div className="w-full">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${locale}-${pathname}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ 
          duration: 0.35, 
          ease: [0.22, 1, 0.36, 1] 
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
