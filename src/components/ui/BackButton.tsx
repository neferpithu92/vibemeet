'use client';

import { useRouter } from '@/lib/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className = '' }: BackButtonProps) {
  const router = useRouter();

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => router.back()}
      className={`absolute top-4 left-4 z-[60] w-10 h-10 flex items-center justify-center rounded-full bg-vibe-dark/40 border border-white/10 backdrop-blur-xl shadow-2xl hover:bg-white/10 transition-all ${className}`}
      aria-label="Back"
    >
      <ChevronLeft className="w-6 h-6 text-white" />
    </motion.button>
  );
}
