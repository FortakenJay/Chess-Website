import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const tileVariants = cva(
  'flex min-h-20 cursor-pointer flex-col justify-between border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed',
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

export function FilterTile({
  label,
  hint,
  icon,
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  hint?: string
  icon?: ReactNode
  active?: boolean
}) {
  return (
    <button type="button" className={cn(tileVariants({ active }), className)} {...props}>
      <span className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em]">{label}</span>
        {icon ? <span className="opacity-80">{icon}</span> : null}
      </span>
      {hint ? (
        <span className={`mt-2 text-xs text-pretty ${active ? 'text-ink/75' : 'text-muted'}`}>
          {hint}
        </span>
      ) : null}
    </button>
  )
}
