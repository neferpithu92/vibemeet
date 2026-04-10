'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from '@/lib/i18n/navigation';

interface SettingRowProps {
  icon?: React.ReactNode | string;
  label: string;
  description?: string;
  value?: string | React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  dangerous?: boolean;
}

export function SettingRow({
  icon,
  label,
  description,
  value,
  href,
  onClick,
  className,
  dangerous = false
}: SettingRowProps) {
  const content = (
    <div className={cn(
      "w-full flex items-center gap-4 py-4 px-2 active:bg-white/5 transition-colors cursor-pointer group",
      className
    )}>
      {/* Icon Container */}
      {icon && (
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform group-hover:scale-110",
          dangerous ? "bg-red-500/10 text-red-500" : "bg-white/5 text-vibe-text-secondary"
        )}>
          {typeof icon === 'string' ? <span>{icon}</span> : icon}
        </div>
      )}

      {/* Text Content */}
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <span className={cn(
          "text-sm font-bold tracking-tight",
          dangerous ? "text-red-500" : "text-vibe-text"
        )}>
          {label}
        </span>
        {description && (
          <span className="text-[10px] text-vibe-text-secondary uppercase tracking-widest mt-0.5 truncate">
            {description}
          </span>
        )}
      </div>

      {/* Value & Chevron */}
      <div className="flex items-center gap-3 shrink-0">
        {value && (
          <span className="text-xs font-semibold text-vibe-purple bg-vibe-purple/10 px-2.5 py-1 rounded-full">
            {value}
          </span>
        )}
        {!onClick && !href ? null : (
          <ChevronRight className="w-4 h-4 text-vibe-text-secondary/40 group-hover:text-vibe-text transition-colors" />
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href as any}>{content}</Link>;
  }

  return (
    <div onClick={onClick} className="w-full">
      {content}
    </div>
  );
}
