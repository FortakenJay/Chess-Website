import type { ReactNode } from 'react'

/** Square board that fits the leftover box — never sized from width alone. */
export function FittedBoardFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-0 min-w-0 flex-1 p-2 [container-type:size]">
      <div className="absolute left-1/2 top-1/2 aspect-square w-[min(100cqw,100cqh)] -translate-x-1/2 -translate-y-1/2">
        {children}
      </div>
    </div>
  )
}
