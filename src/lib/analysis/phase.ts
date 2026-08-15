import { Chess, type PieceSymbol } from 'chess.js'
import type { Phase } from './types'
import thresholds from './phaseThresholds.json'

const NON_PAWN: Record<Exclude<PieceSymbol, 'p' | 'k'>, number> = {
  q: 9,
  r: 5,
  b: 3,
  n: 3,
}

export function nonPawnMaterial(fen: string): number {
  const chess = new Chess(fen)
  let total = 0
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece || piece.type === 'p' || piece.type === 'k') continue
      total += NON_PAWN[piece.type]
    }
  }
  return total
}

export function phaseOf(moveNumber: number, fen: string): Phase {
  if (moveNumber <= thresholds.openingMoveMax) return 'opening'
  if (nonPawnMaterial(fen) <= thresholds.endgameNonPawnMax) return 'endgame'
  return 'middlegame'
}
