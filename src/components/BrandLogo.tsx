import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/cn'

export function BrandLogo({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md'
}) {
  const imgClass = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'

  return (
    <Link
      to="/"
      className={cn(
        'inline-flex min-h-11 items-center gap-2 font-display uppercase tracking-[0.08em] text-ink',
        size === 'sm' ? 'text-base' : 'text-lg',
        className,
      )}
      aria-label="LEAK home"
    >
      <img
        src="/leek-logo.png"
        alt=""
        width={size === 'sm' ? 24 : 32}
        height={size === 'sm' ? 24 : 32}
        className={cn(imgClass, 'shrink-0 object-contain')}
        decoding="async"
      />
      <span>LEAK</span>
    </Link>
  )
}
