import { cva } from 'class-variance-authority'
import { cn } from '@/lib/cn'

export const segmentItemVariants = cva(
  'inline-flex min-h-11 items-center border-b-2 px-3 font-mono text-[11px] uppercase tracking-[0.06em]',
  {
    variants: {
      active: {
        true: 'border-accent bg-surface-2 text-ink',
        false: 'border-transparent text-muted hover:border-line hover:bg-surface-2 hover:text-ink',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
)

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      className={cn('mt-4 flex flex-wrap gap-0 border-b border-line sm:mt-8', className)}
      role="group"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(segmentItemVariants({ active: value === option.value }))}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
