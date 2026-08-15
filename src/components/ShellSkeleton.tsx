import { Skeleton } from '@/components/ui'

export function ShellSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2" aria-hidden="true">
      <div className="space-y-3 pt-4">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-10 max-w-md" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="aspect-square max-w-sm" />
    </div>
  )
}
