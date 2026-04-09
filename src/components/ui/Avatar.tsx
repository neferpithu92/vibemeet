import { cn } from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: AvatarSize;
  hasStory?: boolean;
  isOnline?: boolean;
  fallback?: string;
  className?: string;
  border?: boolean;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-[8px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-32 h-32 text-4xl',
};

/**
 * Avatar utente/venue con stato online e anello storia.
 */
export function Avatar({
  src,
  alt = 'Avatar',
  size = 'md',
  hasStory = false,
  isOnline = false,
  fallback,
  className,
}: AvatarProps) {
  const initials = fallback
    ? fallback.slice(0, 2).toUpperCase()
    : alt?.slice(0, 2).toUpperCase() || 'V';

  const avatarContent = src ? (
    <img
      src={src}
      alt={alt}
      className={cn('rounded-full object-cover', sizeClasses[size])}
    />
  ) : (
    <div
      className={cn(
        'rounded-full bg-vibe-gradient flex items-center justify-center text-white font-bold',
        sizeClasses[size]
      )}
    >
      {initials}
    </div>
  );

  return (
    <div className={cn('relative inline-flex', className)}>
      {hasStory ? (
        <div className="story-ring">
          <div className="bg-vibe-dark rounded-full p-[2px]">
            {avatarContent}
          </div>
        </div>
      ) : (
        avatarContent
      )}
      {isOnline && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full bg-green-400 border-2 border-vibe-dark',
            size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
          )}
        />
      )}
    </div>
  );
}
