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
export function Card({ children, className, hover = false, padding = 'md', onClick }: CardProps) {
  return (
    <div
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
