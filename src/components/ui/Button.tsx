import { cn } from '@/lib/utils';
import React, { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'premium' | 'shining';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary/90',
  secondary: 'bg-secondary text-white hover:bg-secondary/90',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  danger: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  premium: 'bg-vibe-gradient text-white shadow-[0_0_20px_rgba(157,78,221,0.4)] hover:shadow-[0_0_30px_rgba(157,78,221,0.6)]',
  shining: 'vibe-shining-border text-white shadow-xl',
};

const sizes: Record<ButtonSize, string> = {
  xs: 'h-8 px-3 text-xs',
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-base',
  lg: 'h-14 px-8 text-lg',
  xl: 'h-16 px-10 text-xl',
  icon: 'h-10 w-10',
};

/**
 * Bottone VIBE con varianti (primary, secondary, ghost, danger) e dimensioni.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, fullWidth, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-2xl font-display font-black tracking-widest uppercase transition-all duration-300 tap-bounce',
          variants[variant],
          sizes[size],
          fullWidth ? 'w-full' : '',
          isLoading || disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'active:scale-95',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
