'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Camera, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useRouter } from '@/lib/i18n/navigation';

interface ScanResult {
  valid: boolean;
  ticket?: {
    id: string;
    attendee_name?: string;
    ticket_type?: string;
    event_title?: string;
    status: string;
  };
  reason?: string;
}

export default function ScannerPage() {
  const t = useTranslations('scanner');
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [markingUsed, setMarkingUsed] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startCamera();
    return () => { stopCamera(); };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        startScanning();
      }
    } catch (err) {
      setCameraError(true);
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
  };

  const startScanning = () => {
    // In production, use a QR library like html5-qrcode or zxing
    // This is a simplified implementation
    scanIntervalRef.current = setInterval(() => {
      captureAndDecode();
    }, 500);
  };

  const captureAndDecode = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    // TODO: Decode QR from canvas using library
    // For demo, we'll show manual input or simulate
  };

  const handleManualScan = async (qrData: string) => {
    setScanning(false);
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    try {
      const res = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData })
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false, reason: t('scanError') });
    }
  };

  const handleMarkUsed = async () => {
    if (!result?.ticket?.id) return;
    setMarkingUsed(true);
    try {
      await fetch(`/api/tickets/validate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: result.ticket.id })
      });
      setResult(prev => prev ? {
        ...prev,
        ticket: prev.ticket ? { ...prev.ticket, status: 'used' } : prev.ticket
      } : prev);
    } finally {
      setMarkingUsed(false);
    }
  };

  const resetScan = () => {
    setResult(null);
    setScanning(true);
    startScanning();
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-4 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-display text-xl font-bold text-white">{t('title')}</h1>
      </div>

      {/* Camera */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Viewfinder */}
      {scanning && !result && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-64 h-64 border-2 border-white/60 rounded-2xl">
              {/* Corner markers */}
              {[['top-0 left-0', 'border-l-4 border-t-4'], ['top-0 right-0', 'border-r-4 border-t-4'], ['bottom-0 left-0', 'border-l-4 border-b-4'], ['bottom-0 right-0', 'border-r-4 border-b-4']].map(([pos, border], i) => (
                <div key={i} className={`absolute ${pos} w-8 h-8 ${border} border-vibe-purple rounded-sm`} />
              ))}
              {/* Scanning line */}
              <motion.div
                className="absolute left-2 right-2 h-0.5 bg-vibe-purple"
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>
          <p className="text-white/80 text-sm mt-6 text-center px-8">{t('pointCamera')}</p>

          {/* DEV: Manual input for testing */}
          <div className="mt-8 flex gap-2 px-8 w-full max-w-xs">
            <input
              type="text"
              placeholder={t('manualPlaceholder')}
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/40"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleManualScan((e.target as HTMLInputElement).value);
                }
              }}
            />
            <Camera className="w-5 h-5 text-white/60 self-center" />
          </div>
        </div>
      )}

      {/* Result overlay */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 px-6"
          >
            {result.valid ? (
              <div className="text-center space-y-4 w-full max-w-sm">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                  className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-green-400"
                >
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </motion.div>

                <h2 className="text-3xl font-bold text-green-400">✅ {t('validTicket')}</h2>

                <div className="glass-card p-5 rounded-2xl text-left space-y-3 w-full">
                  {result.ticket?.attendee_name && (
                    <div>
                      <p className="text-xs text-vibe-text-secondary">{t('name')}</p>
                      <p className="font-semibold">{result.ticket.attendee_name}</p>
                    </div>
                  )}
                  {result.ticket?.ticket_type && (
                    <div>
                      <p className="text-xs text-vibe-text-secondary">{t('type')}</p>
                      <p className="font-semibold">{result.ticket.ticket_type}</p>
                    </div>
                  )}
                  {result.ticket?.event_title && (
                    <div>
                      <p className="text-xs text-vibe-text-secondary">{t('event')}</p>
                      <p className="font-semibold">{result.ticket.event_title}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-vibe-text-secondary">{t('status')}</p>
                    <span className={`text-sm font-semibold ${result.ticket?.status === 'used' ? 'text-orange-400' : 'text-green-400'}`}>
                      {result.ticket?.status === 'used' ? t('alreadyUsedWarning') : t('validSuccess')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  {result.ticket?.status !== 'used' && (
                    <button
                      onClick={handleMarkUsed}
                      disabled={markingUsed}
                      className="flex-1 btn-primary py-3"
                    >
                      {markingUsed ? '...' : t('markAsUsed')}
                    </button>
                  )}
                  <button
                    onClick={resetScan}
                    className="flex-1 btn-secondary py-3 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> {t('scanAnother')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 w-full max-w-sm">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                  className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-red-400"
                >
                  <XCircle className="w-12 h-12 text-red-400" />
                </motion.div>

                <h2 className="text-3xl font-bold text-red-400">❌ {t('invalidTicket')}</h2>
                <p className="text-vibe-text-secondary">{result.reason || t('scanError')}</p>

                <button
                  onClick={resetScan}
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> {t('scanAnother')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {cameraError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-vibe-dark px-8 text-center gap-4">
          <Camera className="w-16 h-16 text-vibe-text-secondary" />
          <p className="text-vibe-text-secondary">{t('cameraUnavailable')}</p>
          <button onClick={startCamera} className="btn-primary">{t('retry')}</button>
        </div>
      )}
    </div>
  );
}
