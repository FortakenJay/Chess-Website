import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import { cn } from '@/lib/cn'

export const buttonVariants = cva(
  'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 px-4 font-mono text-xs uppercase tracking-[0.06em] disabled:cursor-not-allowed disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'border border-accent bg-accent text-ink hover:bg-accent-low',
        secondary: 'border border-ink text-ink hover:border-accent hover:bg-surface-2',
        ghost: 'border border-line text-muted hover:border-muted hover:bg-surface-2 hover:text-ink',
        quiet: 'quiet border border-transparent text-muted hover:bg-surface-2 hover:text-ink',
        danger: 'border border-blunder/40 text-blunder-text hover:bg-blunder/10',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
)

type ButtonVariants = VariantProps<typeof buttonVariants>

function pressClass(variant: ButtonVariants['variant']) {
  return variant === 'quiet' ? undefined : 'control'
}

export function Button({
  variant,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariants) {
  return (
    <button
      type={type}
      className={cn(pressClass(variant), buttonVariants({ variant }), className)}
      {...props}
    />
  )
}

export function ButtonLink({
  variant,
  className,
  children,
  ...props
}: LinkProps & ButtonVariants & { className?: string; children: ReactNode }) {
  return (
    <Link className={cn(pressClass(variant), buttonVariants({ variant }), className)} {...props}>
      {children}
    </Link>
  )
}

export function IconButton({
  label,
  variant = 'quiet',
  className,
  type = 'button',
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> &
  ButtonVariants & {
    label: string
    children: ReactNode
  }) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(pressClass(variant), buttonVariants({ variant }), 'px-0', className)}
      {...props}
    />
  )
}
