import { TabBar, TabButton } from './TabBar'
import { cn } from '@/lib/cn'

/** @deprecated Use `tabItemVariants` from `TabBar`. Kept for existing imports. */
export { tabItemVariants as segmentItemVariants } from './TabBar'

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
    <TabBar label={label} className={cn('mt-4 flex-wrap sm:mt-8', className)}>
      {options.map((option) => (
        <TabButton
          key={option.value}
          active={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </TabButton>
      ))}
    </TabBar>
  )
}
