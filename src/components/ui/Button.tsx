import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import { cn } from '@/lib/cn'

export const buttonVariants = cva(
  'inline-flex items-center justify-center disabled:opacity-40',
  {
    variants: {
      variant: {
        primary:
          'border border-ink bg-ink px-3 py-2 text-sm text-canvas hover:bg-surface-2 hover:text-ink',
        secondary: 'border border-ink px-3 py-2 text-sm hover:bg-surface-2 hover:text-ink',
        ghost: 'border border-line px-3 py-1.5 text-sm hover:bg-surface-2 hover:text-ink',
        quiet: 'px-3 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-ink',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
)

type ButtonVariants = VariantProps<typeof buttonVariants>

export function Button({
  variant,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariants) {
  return <button type={type} className={cn(buttonVariants({ variant }), className)} {...props} />
}

export function ButtonLink({
  variant,
  className,
  children,
  ...props
}: LinkProps & ButtonVariants & { className?: string; children: ReactNode }) {
  return (
    <Link className={cn('control', buttonVariants({ variant }), className)} {...props}>
      {children}
    </Link>
  )
}
