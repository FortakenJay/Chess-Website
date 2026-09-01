import type { ReactNode } from 'react'

export const fieldLabelClass =
  'font-mono text-[11px] uppercase tracking-[0.08em] text-muted'

export const fieldControlClass =
  'min-h-11 w-full border border-line bg-canvas px-3 text-base text-ink placeholder:text-muted/70 hover:border-muted focus:border-accent sm:text-sm'

export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-blunder-text" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
