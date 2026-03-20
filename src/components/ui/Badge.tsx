import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'verified' | 'live' | 'new' | 'premium' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  verified: 'badge-verified',
  live: 'badge-live',
  new: 'badge-new',
  premium: 'badge-premium',
  default: 'badge bg-white/10 text-vibe-text-secondary',
};

/**
 * Badge per stati — verificato, live, nuovo, premium.
 */
export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn(variantClasses[variant], className)}>
      {variant === 'live' && (
        <span className="w-2 h-2 bg-red-400 rounded-full mr-1.5 animate-pulse" />
      )}
      {variant === 'verified' && <span className="mr-1">✓</span>}
      {children}
    </span>
  );
}
