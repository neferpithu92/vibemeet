'use client';

import { Card } from '@/components/ui/Card';

export function PostSkeleton() {
  return (
    <Card className="overflow-hidden border-vibe-border animate-pulse mb-8">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-vibe-surface shimmer" />
          <div className="space-y-2">
            <div className="w-24 h-3 bg-vibe-surface rounded shimmer" />
            <div className="w-16 h-2 bg-vibe-surface rounded shimmer opacity-60" />
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-vibe-surface shimmer" />
      </div>

      {/* Media Skeleton */}
      <div className="aspect-square bg-vibe-surface/40 shimmer" />

      {/* Actions Skeleton */}
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-20 h-8 rounded-full bg-vibe-surface shimmer" />
          <div className="w-20 h-8 rounded-full bg-vibe-surface shimmer" />
        </div>
        <div className="w-8 h-8 rounded-full bg-vibe-surface shimmer" />
      </div>
    </Card>
  );
}

export function StorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 min-w-fit animate-pulse">
      <div className="w-16 h-16 rounded-full bg-vibe-surface p-1 border-2 border-vibe-border shimmer" />
      <div className="w-12 h-2 bg-vibe-surface rounded shimmer opacity-60" />
    </div>
  );
}
