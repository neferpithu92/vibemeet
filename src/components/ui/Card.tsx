import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

/**
 * Card glassmorphism VIBE — base per tutti i container.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, hover = false, padding = 'md', onClick }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          hover ? 'glass-card-hover' : 'glass-card',
          paddingClasses[padding],
          className
        )}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
