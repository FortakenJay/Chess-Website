import { cva, type VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const kickerVariants = cva('font-mono text-[11px] uppercase tracking-[0.08em]', {
  variants: {
    tone: {
      muted: 'text-muted',
      accent: 'text-accent',
    },
  },
  defaultVariants: {
    tone: 'muted',
  },
})

export function Kicker({
  tone,
  className,
  children,
}: VariantProps<typeof kickerVariants> & {
  className?: string
  children: ReactNode
}) {
  return <p className={cn(kickerVariants({ tone }), className)}>{children}</p>
}
