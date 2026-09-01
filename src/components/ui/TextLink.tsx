import { cva, type VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import { cn } from '@/lib/cn'

export const textLinkVariants = cva('inline-flex min-h-11 items-center', {
  variants: {
    variant: {
      nav: 'px-2 text-muted hover:text-ink',
      underline: 'font-medium text-ink underline decoration-accent underline-offset-4',
    },
  },
  defaultVariants: {
    variant: 'nav',
  },
})

export function TextLink({
  variant,
  className,
  children,
  ...props
}: LinkProps & VariantProps<typeof textLinkVariants> & { className?: string; children: ReactNode }) {
  return (
    <Link className={cn(textLinkVariants({ variant }), className)} {...props}>
      {children}
    </Link>
  )
}
