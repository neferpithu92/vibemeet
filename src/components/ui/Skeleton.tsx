import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/**
 * Componente Skeleton universale per i caricamenti asincroni.
 * Supporta forme circolari, rettangolari e bordi arrotondati tramite classi Tailwind.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-white/[0.08] shimmer-effect",
        className
      )}
    />
  );
}

/**
 * Skeleton per le Card della Mappa / Feed
 */
export function CardSkeleton() {
  return (
    <div className="glass-card p-4 space-y-4 w-full">
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>
      <div className="pt-2 flex justify-between">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton per le Venue nella Mappa (Lista)
 */
export function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 p-3 glass-card items-center">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-3 w-2/3 rounded opacity-50" />
          </div>
        </div>
      ))}
    </div>
  );
}
