import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Panel } from './Panel'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton-bone bg-surface-2', className)} {...props} />
}

function FilterBone({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-9 w-28" />
    </div>
  )
}

export function PositionsSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('mt-8 flex flex-col gap-5', className)}
      aria-busy="true"
      aria-label="Loading positions"
    >
      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <FilterBone />
          <FilterBone className="min-w-44" />
          <FilterBone />
          <FilterBone className="min-w-36" />
          <FilterBone className="min-w-36" />
          <Skeleton className="ml-auto h-9 w-32" />
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-line pt-3">
          <FilterBone />
          <FilterBone />
          <FilterBone />
        </div>
      </Panel>

      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <div className="overflow-hidden border border-line">
        <div className="flex gap-3 bg-surface-2 px-3 py-2">
          {['w-14', 'w-16', 'w-8', 'w-8', 'w-14', 'w-20', 'w-16', 'w-12', 'w-16'].map((w, i) => (
            <Skeleton key={i} className={cn('h-3', w)} />
          ))}
        </div>
        {Array.from({ length: 10 }, (_, row) => (
          <div key={row} className="flex items-center gap-3 border-t border-line px-3 py-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function BoardPageSkeleton({
  className,
  label = 'Loading board',
}: {
  className?: string
  label?: string
}) {
  return (
    <div
      className={cn(
        'mt-4 grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-4',
        className,
      )}
      aria-busy="true"
      aria-label={label}
    >
      <div className="flex min-h-0 min-w-0 flex-col border border-line bg-surface">
        <div className="shrink-0 border-b border-line px-3 py-2">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="relative min-h-0 min-w-0 flex-1 p-2 [container-type:size]">
          <Skeleton className="absolute left-1/2 top-1/2 aspect-square w-[min(100cqw,100cqh)] -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
      <aside className="flex min-h-0 flex-col gap-3">
        <Panel className="shrink-0 space-y-3">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </Panel>
        <Panel className="shrink-0 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </Panel>
        <div className="mt-auto grid grid-cols-2 gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </aside>
    </div>
  )
}

export function ResultsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('mt-8 space-y-8', className)} aria-busy="true" aria-label="Loading results">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Panel padding="md" className="space-y-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 max-w-2xl" />
        <Skeleton className="h-4 max-w-xl" />
        <Skeleton className="h-3 w-48" />
      </Panel>
      {Array.from({ length: 3 }, (_, section) => (
        <div key={section} className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="grid gap-4 md:grid-cols-2">
            <Panel className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-40 w-full" />
            </Panel>
            <Panel className="space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-40 w-full" />
            </Panel>
          </div>
        </div>
      ))}
    </div>
  )
}

export function PreviewListSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('mt-8 space-y-3', className)} aria-busy="true" aria-label="Loading preview">
      <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="grid gap-3 bg-surface px-4 py-4 sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:items-center"
        >
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-3 w-16 justify-self-end" />
        </div>
      ))}
    </div>
  )
}

export function PuzzlesFiltersSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('mt-6 space-y-6', className)} aria-busy="true" aria-label="Loading puzzles">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="space-y-2 text-right">
          <Skeleton className="ml-auto h-3 w-16" />
          <Skeleton className="ml-auto h-7 w-20" />
          <Skeleton className="ml-auto h-8 w-36" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-28" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <FilterBone />
          <FilterBone />
          <Skeleton className="ml-auto h-9 w-28" />
        </div>
      </Panel>
    </div>
  )
}
