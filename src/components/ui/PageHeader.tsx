import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Shared page chrome for analysis routes (Results, Positions, Drill, …). */
export function PageHeader({
  title,
  username,
  description,
  meta,
  actions,
  className,
}: {
  title: string
  username?: string
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{title}</h1>
        {username ? (
          <p className="mt-2 truncate font-mono text-2xl tracking-tight" translate="no">
            {username}
          </p>
        ) : null}
        {description ? (
          <p className="mt-2 max-w-xl text-pretty text-sm text-muted">{description}</p>
        ) : null}
        {meta ? <div className="mt-1">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
