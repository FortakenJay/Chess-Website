import { cn } from '@/lib/cn'

type LatticeMode = 'hero' | 'leak' | 'progress' | 'footer'

const HEAT = [
  0.08, 0.12, 0.09, 0.16, 0.11, 0.07, 0.1, 0.06,
  0.1, 0.15, 0.13, 0.2, 0.18, 0.12, 0.09, 0.08,
  0.14, 0.2, 0.28, 0.36, 0.31, 0.22, 0.17, 0.11,
  0.12, 0.24, 0.46, 0.78, 0.91, 0.52, 0.23, 0.14,
  0.09, 0.19, 0.38, 0.72, 0.88, 0.49, 0.21, 0.12,
  0.07, 0.14, 0.24, 0.42, 0.39, 0.27, 0.16, 0.09,
  0.05, 0.1, 0.15, 0.22, 0.2, 0.14, 0.09, 0.06,
  0.04, 0.07, 0.1, 0.12, 0.11, 0.08, 0.06, 0.04,
]

const STARTING_POSITION = [
  '♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜',
  '♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟',
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  '♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙',
  '♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖',
]

const LEAK_CELLS = new Set([27, 28, 35, 36])

export function LandingLattice({
  mode = 'hero',
  className,
}: {
  mode?: LatticeMode
  className?: string
}) {
  return (
    <div className={cn('landing-lattice', className)} data-mode={mode} aria-hidden>
      <div className="landing-lattice-grid">
        {HEAT.map((rate, index) => (
          <span
            className="landing-lattice-cell"
            data-leak={LEAK_CELLS.has(index) ? '' : undefined}
            data-rate={rate}
            key={index}
          >
            <span className="landing-lattice-fill" />
            <span className="landing-lattice-mark">×</span>
            <span className="landing-lattice-piece">{STARTING_POSITION[index]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
