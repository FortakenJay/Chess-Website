import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import { cn } from '@/lib/cn'

export const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center px-4 font-mono text-xs uppercase tracking-[0.06em] disabled:cursor-not-allowed disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'border border-accent bg-accent text-ink hover:bg-accent-low',
        secondary: 'border border-ink text-ink hover:border-accent hover:bg-surface-2',
        ghost: 'border border-line text-muted hover:border-muted hover:bg-surface-2 hover:text-ink',
        quiet: 'border border-transparent text-muted hover:bg-surface-2 hover:text-ink',
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
