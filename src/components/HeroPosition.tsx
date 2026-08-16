import type { CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import { productBoardStyles } from '@/lib/boardTheme'
import { ClassificationBadge } from '@/components/ClassificationBadge'

const FEN = '2r3k1/5ppp/4p3/p7/1p2nP2/1P2P3/P5PP/2R3K1 b - - 0 28'

const SQUARE_STYLES: Record<string, CSSProperties> = {
  e4: { backgroundColor: 'rgba(229, 72, 77, 0.5)' },
  c8: { backgroundColor: 'rgba(236, 236, 236, 0.16)' },
  c1: { backgroundColor: 'rgba(236, 236, 236, 0.16)' },
}

export function HeroPosition() {
  return (
    <figure className="border border-line bg-surface">
      <div className="flex gap-2 p-3">
        <div
          className="flex w-1.5 shrink-0 flex-col-reverse bg-surface-2"
          title="Evaluation +2.4"
          aria-label="White is ahead by 2.4 pawns"
        >
          <div className="bg-ink" style={{ height: '74%' }} />
        </div>
        <div className="min-w-0 flex-1">
          <Chessboard
            options={{
              position: FEN,
              boardOrientation: 'black',
              allowDragging: false,
              squareStyles: SQUARE_STYLES,
              ...productBoardStyles,
              boardStyle: { width: '100%' },
            }}
          />
        </div>
      </div>
      <figcaption className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
        <ClassificationBadge value="blunder" />
        <span className="font-mono text-xs text-muted">Move 28, Black</span>
        <span className="font-mono text-xs text-blunder-text">played Ne4</span>
        <span className="font-mono text-xs text-muted">engine Rxc1</span>
      </figcaption>
    </figure>
  )
}
