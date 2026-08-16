import type { MoveQuality } from '@/lib/analysis/types'

/** Format white-relative CP as Chess.com-style ±N.NN or #N. */
export function formatEval(cp: number, mate: number | null = null): string {
  if (mate != null && mate !== 0) {
    return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`
  }
  if (Math.abs(cp) >= 90_000) {
    return cp > 0 ? 'M1' : '-M1'
  }
  const pawns = cp / 100
  const abs = Math.abs(pawns)
  const body = abs >= 10 ? abs.toFixed(1) : abs.toFixed(2)
  if (pawns > 0.005) return `+${body}`
  if (pawns < -0.005) return `-${body}`
  return '0.00'
}

/** Map eval to 0–100 height % for the white side of an eval bar. */
export function evalBarWhitePct(cp: number): number {
  if (Math.abs(cp) >= 90_000) return cp > 0 ? 100 : 0
  // Soft logistic so ±5 ≈ ~90%
  const capped = Math.max(-800, Math.min(800, cp))
  return 50 + 50 * Math.tanh(capped / 400)
}

export const QUALITY_LABEL: Record<MoveQuality, string> = {
  brilliant: 'Brilliant',
  great: 'Great',
  book: 'Book',
  best: 'Best',
  excellent: 'Excellent',
  good: 'Good',
  miss: 'Miss',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
}

export const QUALITY_COLOR: Record<MoveQuality, string> = {
  brilliant: 'var(--color-quality-brilliant)',
  great: 'var(--color-quality-great)',
  book: 'var(--color-quality-book)',
  best: 'var(--color-quality-best)',
  excellent: 'var(--color-quality-excellent)',
  good: 'var(--color-quality-good)',
  miss: 'var(--color-quality-miss)',
  inaccuracy: 'var(--color-inaccuracy)',
  mistake: 'var(--color-mistake)',
  blunder: 'var(--color-blunder)',
}

export function coachCopy(quality: MoveQuality | null | undefined, san: string): {
  title: string
  body: string
} {
  switch (quality) {
    case 'brilliant':
      return { title: `${san} is brilliant!!`, body: 'Sacrificial gem — the engine agrees.' }
    case 'great':
      return { title: `${san} is a great move!`, body: 'A critical move that keeps the game alive.' }
    case 'book':
      return { title: `${san} is book`, body: 'Established opening theory.' }
    case 'best':
      return { title: `${san} is best`, body: 'Engine agrees. Keep finding these.' }
    case 'excellent':
      return { title: `${san} is excellent`, body: 'Near-perfect. Tiny improvement available.' }
    case 'good':
      return { title: `${san} is good`, body: 'Solid. Still a slightly stronger idea on the board.' }
    case 'miss':
      return { title: `${san} is a miss`, body: 'Your opponent gave you a winning chance, but it slipped away.' }
    case 'inaccuracy':
      return { title: `${san} is an inaccuracy`, body: 'Playable, but you give away a clear edge.' }
    case 'mistake':
      return { title: `${san} is a mistake`, body: 'The position turns against you here.' }
    case 'blunder':
      return { title: `${san} is a blunder`, body: 'Heavy loss of advantage — find the better move.' }
    default:
      return { title: 'Position', body: 'Step through the game and watch the eval shift.' }
  }
}
