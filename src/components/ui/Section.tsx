import { cva } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const sectionBodyVariants = cva('mt-4', {
  variants: {
    columns: {
      true: 'grid gap-4 md:grid-cols-2',
      false: '',
    },
  },
  defaultVariants: {
    columns: true,
  },
})

export function Section({
  title,
  children,
  columns = true,
  className,
}: {
  title: string
  children: ReactNode
  columns?: boolean
  className?: string
}) {
  return (
    <section className={cn('mt-10', className)}>
      <h2 className="border-b border-line pb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        {title}
      </h2>
      <div className={cn(sectionBodyVariants({ columns }))}>{children}</div>
    </section>
  )
}
