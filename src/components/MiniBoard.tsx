import { Chessboard } from 'react-chessboard'
import { productBoardStyles } from '@/lib/boardTheme'
import { pawnOnlyFen } from '@/lib/openings/structures'

export function MiniBoard({
  fen,
  highlights = [],
  pawnsOnly = false,
}: {
  fen: string
  highlights?: string[]
  pawnsOnly?: boolean
}) {
  const squareStyles = Object.fromEntries(
    highlights.map((square) => [square, { backgroundColor: 'rgba(62, 207, 142, 0.28)' }]),
  )
  return (
    <div className="aspect-square w-full max-w-[18rem] border border-line">
      <Chessboard
        options={{
          position: pawnsOnly ? pawnOnlyFen(fen) : fen,
          allowDragging: false,
          squareStyles,
          ...productBoardStyles,
          boardStyle: { width: '100%', height: '100%' },
        }}
      />
    </div>
  )
}
