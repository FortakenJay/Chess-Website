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
    <section className={cn('mt-12', className)}>
      <h2 className="border-b border-line pb-3 font-display text-xl uppercase leading-none tracking-[-0.01em] text-ink sm:text-2xl">
        {title}
      </h2>
      <div className={cn(sectionBodyVariants({ columns }))}>{children}</div>
    </section>
  )
}
