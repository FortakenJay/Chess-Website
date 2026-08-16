import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { panelVariants } from './Panel'

export const emptyStateVariants = cva('mt-6 text-sm text-muted', {
  variants: {
    tone: {
      muted: '',
      alert: 'text-blunder-text',
    },
  },
  defaultVariants: {
    tone: 'muted',
  },
})

export function LoadingText({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={cn('mt-8 font-mono text-xs text-muted', className)} aria-live="polite">
      {children}
    </p>
  )
}

export function ErrorText({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={cn('mt-4 text-sm text-blunder-text', className)} role="alert">
      {children}
    </p>
  )
}

export function EmptyState({
  children,
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof emptyStateVariants> & {
    children: ReactNode
  }) {
  return (
    <div
      className={cn(panelVariants({ padding: 'lg' }), emptyStateVariants({ tone }), className)}
      {...props}
    >
      {children}
    </div>
  )
}
