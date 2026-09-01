import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Section({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('mt-12', className)}>
      <h2 className="border-b border-line pb-3 font-display text-xl uppercase leading-none tracking-[-0.01em] text-balance text-ink sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  )
}
