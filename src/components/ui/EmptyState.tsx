'use client';

import { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: LucideIcon | string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = ''
}: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center py-20 px-6 text-center ${className}`}
    >
      <div className="w-20 h-20 rounded-3xl bg-vibe-gradient/10 flex items-center justify-center mb-6 text-4xl shadow-[0_0_30px_rgba(157,78,221,0.1)]">
        {typeof Icon === 'string' ? (
          <span>{Icon}</span>
        ) : (
          <Icon className="w-10 h-10 text-vibe-purple" />
        )}
      </div>
      
      <h3 className="text-xl font-bold mb-2 tracking-tight text-white">{title}</h3>
      <p className="text-sm text-vibe-text-secondary max-w-xs mb-8 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction} className="px-8 font-bold">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
