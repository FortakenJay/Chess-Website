import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Full-width stacked actions on phones; inline row from `sm` up. */
export function ActionRow({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex w-full flex-col gap-2 [&>*]:w-full sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:[&>*]:w-auto',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
