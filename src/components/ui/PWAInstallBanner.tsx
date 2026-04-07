'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed or dismissed before
    const alreadyDismissed = localStorage.getItem('pwa-banner-dismissed');
    if (alreadyDismissed) return;

    // Check if already installed (in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  if (!showBanner || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-40 glass-card p-4 rounded-2xl border border-vibe-purple/30 shadow-2xl flex items-center gap-3"
      >
        <div className="w-10 h-10 bg-vibe-purple/20 rounded-xl flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-vibe-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">📱 Installa vibemeet</p>
          <p className="text-xs text-vibe-text-secondary">Per la migliore esperienza</p>
        </div>
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-vibe-purple rounded-lg text-white text-xs font-semibold hover:bg-vibe-purple/80 transition-all shrink-0"
        >
          Installa
        </button>
        <button onClick={handleDismiss} className="text-vibe-text-secondary hover:text-vibe-text shrink-0">
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
