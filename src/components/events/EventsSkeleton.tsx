import { Card } from '@/components/ui/Card';

export default function EventsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-6 animate-pulse">
        <div className="h-8 bg-white/5 rounded-lg w-32" />
        <div className="h-10 bg-white/10 rounded-xl w-36" />
      </div>

      {/* Filters Skeleton */}
      <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar pb-1 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-white/5 rounded-xl w-24 shrink-0" />
        ))}
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} padding="none" className="overflow-hidden border-white/5 animate-pulse">
            <div className="h-40 bg-white/5" />
            <div className="p-4 space-y-3">
              <div className="h-5 bg-white/10 rounded w-3/4" />
              <div className="h-4 bg-white/5 rounded w-1/2" />
              <div className="flex justify-between items-center pt-2">
                <div className="space-y-2">
                  <div className="h-3 bg-white/5 rounded w-20" />
                  <div className="h-3 bg-white/5 rounded w-16" />
                </div>
                <div className="h-5 bg-white/10 rounded w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
