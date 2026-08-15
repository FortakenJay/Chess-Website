import type { ReactNode } from 'react'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { cn } from '@/lib/cn'
import { usePlayerAvatar } from '@/lib/usePlayerAvatar'

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
  const avatarUrl = usePlayerAvatar(username)

  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{title}</h1>
        {username ? (
          <div className="mt-2 flex min-w-0 items-center gap-3">
            <PlayerAvatar username={username} src={avatarUrl} size={36} />
            <p className="truncate font-mono text-xl tracking-tight sm:text-2xl" translate="no">
              {username}
            </p>
          </div>
        ) : null}
        {description ? (
          <p className="mt-2 max-w-xl text-pretty text-sm text-muted">{description}</p>
        ) : null}
        {meta ? <div className="mt-1">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-col gap-2 [&>*]:w-full sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:[&>*]:w-auto">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
