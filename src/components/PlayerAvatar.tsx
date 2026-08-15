import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

export function PlayerAvatar({
  username,
  src,
  size = 28,
  className,
  alt,
}: {
  username: string
  src?: string | null
  size?: number
  className?: string
  alt?: string
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [src])
  const letter = (username.trim().slice(0, 1) || '?').toUpperCase()
  const showImage = Boolean(src) && !failed

  if (!showImage) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center border border-line bg-surface-2 font-mono text-muted',
          className,
        )}
        style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.42)) }}
        aria-hidden={alt ? undefined : true}
        title={alt || undefined}
      >
        {letter}
      </span>
    )
  }

  return (
    <img
      src={src!}
      alt={alt ?? ''}
      width={size}
      height={size}
      className={cn('shrink-0 border border-line object-cover', className)}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  )
}
