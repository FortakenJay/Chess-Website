import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Square board that fits the leftover box — never sized from width alone. */
export function FittedBoardFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative h-full min-h-0 min-w-0 w-full p-2 [container-type:size]',
        className,
      )}
    >
      <div className="absolute left-1/2 top-1/2 aspect-square w-[min(100cqw,100cqh)] -translate-x-1/2 -translate-y-1/2">
        {children}
      </div>
    </div>
  )
}

/**
 * Phone: square board, then the coaching column in page flow.
 * Desktop: leftover-box board + scrolling side panel.
 */
export function PlaySplit({
  board,
  panel,
  boardLabel,
  panelWidth = 'wide',
}: {
  board: ReactNode
  panel: ReactNode
  boardLabel?: ReactNode
  panelWidth?: 'narrow' | 'wide' | 'copy'
}) {
  return (
    <div
      className={cn(
        'grid min-h-0 min-w-0 gap-4 lg:h-full lg:min-h-0 lg:flex-1',
        panelWidth === 'narrow'
          ? 'lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]'
          : panelWidth === 'copy'
            ? 'lg:grid-cols-[minmax(0,1fr)_minmax(20rem,32rem)]'
            : 'lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)]',
      )}
    >
      <div className="flex min-w-0 flex-col border border-line bg-surface lg:min-h-0">
        {boardLabel ? (
          <div className="shrink-0 border-b border-line px-4 py-3 font-mono text-sm">{boardLabel}</div>
        ) : null}
        <div className="relative aspect-square w-full lg:aspect-auto lg:min-h-0 lg:flex-1">
          <FittedBoardFrame>{board}</FittedBoardFrame>
        </div>
      </div>
      <aside className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto pb-[max(1.25rem,var(--safe-bottom))] lg:pb-2">
        {panel}
      </aside>
    </div>
  )
}
