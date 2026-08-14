export function ShellSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2" aria-hidden="true">
      <div className="space-y-3 pt-4">
        <div className="h-3 w-36 bg-surface-2" />
        <div className="h-10 max-w-md bg-surface-2" />
        <div className="h-4 w-2/3 bg-surface-2" />
        <div className="h-10 w-24 bg-surface-2" />
      </div>
      <div className="aspect-square max-w-sm bg-surface-2" />
    </div>
  )
}
