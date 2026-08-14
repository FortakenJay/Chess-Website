import { Chess, type Square } from 'chess.js'
import type { CSSProperties } from 'react'

export function legalMovesFrom(fen: string, square: string) {
  try {
    const board = new Chess(fen)
    return board.moves({ square: square as Square, verbose: true })
  } catch {
    return []
  }
}

export function legalMoveStyles(
  fen: string,
  selectedSquare: string | null,
): Record<string, CSSProperties> {
  if (!selectedSquare) return {}
  const styles: Record<string, CSSProperties> = {
    [selectedSquare]: {
      boxShadow: 'inset 0 0 0 3px rgba(236, 236, 236, 0.8)',
    },
  }
  for (const move of legalMovesFrom(fen, selectedSquare)) {
    styles[move.to] = {
      backgroundImage:
        'radial-gradient(circle, rgba(236, 236, 236, 0.72) 0 18%, transparent 20%)',
    }
  }
  return styles
}
