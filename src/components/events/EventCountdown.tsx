'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface EventCountdownProps {
  startsAt: string;
  locale?: string;
}

export default function EventCountdown({ startsAt, locale = 'it' }: EventCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const start = new Date(startsAt).getTime();
      const diff = start - now;

      if (diff <= 0) {
        setStarted(true);
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      });
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startsAt]);

  if (started) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-2xl px-4 py-3"
      >
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-red-400 font-bold text-sm">🔴 LIVE ORA</span>
      </motion.div>
    );
  }

  if (!timeLeft) return null;

  const labels = locale === 'it'
    ? ['giorni', 'ore', 'min', 'sec']
    : ['days', 'hours', 'min', 'sec'];

  return (
    <div className="glass-card p-4 rounded-2xl">
      <p className="text-xs text-vibe-text-secondary uppercase tracking-wider mb-3 font-semibold">
        {locale === 'it' ? '⏱ Inizia tra' : '⏱ Starts in'}
      </p>
      <div className="flex items-center gap-3">
        {[
          { value: timeLeft.days, label: labels[0] },
          { value: timeLeft.hours, label: labels[1] },
          { value: timeLeft.minutes, label: labels[2] },
          { value: timeLeft.seconds, label: labels[3] }
        ].map(({ value, label }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <span className="text-vibe-text-secondary text-xl font-bold">:</span>}
            <div className="flex flex-col items-center">
              <motion.div
                key={value}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-vibe-purple/20 border border-vibe-purple/30 rounded-xl w-14 h-14 flex items-center justify-center"
              >
                <span className="font-display text-2xl font-bold text-vibe-purple">
                  {String(value).padStart(2, '0')}
                </span>
              </motion.div>
              <span className="text-xs text-vibe-text-secondary mt-1">{label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
