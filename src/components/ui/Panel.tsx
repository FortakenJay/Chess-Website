import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const panelVariants = cva('border border-line bg-surface', {
  variants: {
    padding: {
      none: 'p-0',
      sm: 'p-4',
      md: 'px-5 py-6 md:px-6',
      lg: 'p-5',
    },
  },
  defaultVariants: {
    padding: 'sm',
  },
})

type PanelVariants = VariantProps<typeof panelVariants>

export function Panel({
  children,
  className,
  padding,
  ...props
}: HTMLAttributes<HTMLDivElement> &
  PanelVariants & {
    children: ReactNode
  }) {
  return (
    <div className={cn(panelVariants({ padding }), className)} {...props}>
      {children}
    </div>
  )
}
