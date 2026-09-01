import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const chipVariants = cva(
  'quiet inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center border px-3 font-mono text-xs uppercase tracking-[0.06em] disabled:cursor-not-allowed disabled:opacity-40',
  {
    variants: {
      active: {
        true: 'border-accent bg-accent-low text-ink',
        false: 'border-line bg-surface text-ink hover:border-muted hover:bg-surface-2',
      },
    },
    defaultVariants: { active: false },
  },
)

type ChipVariants = VariantProps<typeof chipVariants>

function ChipButton({
  active,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & ChipVariants) {
  return (
    <button
      type={type}
      aria-pressed={Boolean(active)}
      className={cn(chipVariants({ active }), className)}
      {...props}
    />
  )
}

function ChipFile({
  children,
  className,
  ...inputProps
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> & {
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn(chipVariants({ active: false }), className)}>
      {children}
      <input type="file" className="sr-only" {...inputProps} />
    </label>
  )
}

export const Chip = Object.assign(ChipButton, { File: ChipFile })
