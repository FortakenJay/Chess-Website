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

export function pieceColorOn(fen: string, square: string): 'w' | 'b' | null {
  try {
    return new Chess(fen).get(square as Square)?.color ?? null
  } catch {
    return null
  }
}

export function sideToMoveColor(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w'
}

/**
 * Chess.com / Lichess style: clicking another of your pieces switches selection
 * instead of trying to move there.
 */
export function nextSelectedSquare(
  fen: string,
  selectedSquare: string | null,
  clickedSquare: string,
): { action: 'select'; square: string | null } | { action: 'move'; from: string; to: string } {
  if (selectedSquare === clickedSquare) {
    return { action: 'select', square: null }
  }

  const side = sideToMoveColor(fen)
  const clickedColor = pieceColorOn(fen, clickedSquare)
  if (clickedColor === side) {
    return {
      action: 'select',
      square: legalMovesFrom(fen, clickedSquare).length > 0 ? clickedSquare : null,
    }
  }

  if (selectedSquare) {
    return { action: 'move', from: selectedSquare, to: clickedSquare }
  }

  return { action: 'select', square: null }
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
