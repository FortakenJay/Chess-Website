import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { ActionRow } from './ActionRow'
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

function EmptyStateRoot({
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

function EmptyStateTitle({ children }: { children: ReactNode }) {
  return <p className="font-display text-xl uppercase leading-none text-ink">{children}</p>
}

function EmptyStateBody({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-pretty">{children}</p>
}

function EmptyStateActions({ children }: { children: ReactNode }) {
  return <ActionRow className="mt-4">{children}</ActionRow>
}

export const EmptyState = Object.assign(EmptyStateRoot, {
  Title: EmptyStateTitle,
  Body: EmptyStateBody,
  Actions: EmptyStateActions,
})
