import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const tabItemVariants = cva(
  'inline-flex min-h-11 shrink-0 cursor-pointer items-center border-b-2 px-3 font-mono text-[11px] uppercase tracking-[0.06em] disabled:cursor-not-allowed',
  {
    variants: {
      active: {
        true: 'border-accent text-ink',
        false: 'border-transparent text-muted hover:border-line hover:text-ink',
      },
      surface: {
        page: '',
        header: '',
      },
    },
    compoundVariants: [
      { active: true, surface: 'page', class: 'bg-surface-2' },
      { active: false, surface: 'page', class: 'hover:bg-surface-2' },
    ],
    defaultVariants: {
      active: false,
      surface: 'page',
    },
  },
)

export function TabBar({
  label,
  children,
  className,
  as: Comp = 'div',
}: {
  label: string
  children: ReactNode
  className?: string
  as?: 'div' | 'nav'
}) {
  return (
    <Comp
      className={cn(
        'flex gap-0 overflow-x-auto border-b border-line [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      role={Comp === 'nav' ? undefined : 'group'}
      aria-label={label}
    >
      {children}
    </Comp>
  )
}

export function TabButton({
  active,
  surface,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof tabItemVariants>) {
  return (
    <button
      type={type}
      aria-pressed={Boolean(active)}
      className={cn(tabItemVariants({ active, surface }), className)}
      {...props}
    />
  )
}
