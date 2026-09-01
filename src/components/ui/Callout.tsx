import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Accent-rail panel for page intros and prompts. */
export function Callout({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        'border border-line border-l-4 border-l-accent bg-surface p-5 sm:p-7',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
