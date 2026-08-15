import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

export const selectFieldVariants = cva(
  'flex flex-col gap-1 text-[11px] uppercase tracking-[0.14em] text-muted',
  {
    variants: {
      size: {
        sm: '',
        md: 'min-w-36',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  },
)

export const selectControlVariants = cva(
  'border border-line bg-canvas px-2 py-1.5 font-mono text-xs text-ink outline-none',
  {
    variants: {
      size: {
        sm: 'min-w-28',
        md: 'min-w-36',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  },
)

export function SelectField({
  label,
  value,
  onChange,
  options,
  labels,
  className,
  size,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  labels?: Record<string, string>
  className?: string
} & VariantProps<typeof selectFieldVariants>) {
  return (
    <label className={cn(selectFieldVariants({ size }), className)}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(selectControlVariants({ size }))}
      >
        {options.map((opt) => (
          <option key={opt || 'all'} value={opt}>
            {labels?.[opt] ?? (opt === '' ? 'all' : opt.replaceAll('_', ' '))}
          </option>
        ))}
      </select>
    </label>
  )
}
