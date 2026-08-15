import { Chess, type PieceSymbol } from 'chess.js'
import type { EndgameType } from './types'

const VALUE: Record<Exclude<PieceSymbol, 'k'>, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
}

export function endgameTypeOf(fen: string): EndgameType {
  const board = new Chess(fen)
  let queens = 0
  let rooks = 0
  let minors = 0
  let pawns = 0
  for (const row of board.board()) {
    for (const piece of row) {
      if (!piece || piece.type === 'k') continue
      if (piece.type === 'q') queens += 1
      else if (piece.type === 'r') rooks += 1
      else if (piece.type === 'b' || piece.type === 'n') minors += 1
      else if (piece.type === 'p') pawns += 1
    }
  }
  const kinds = [queens > 0, rooks > 0, minors > 0].filter(Boolean).length
  if (kinds > 1) return 'mixed'
  if (queens > 0) return 'queen'
  if (rooks > 0) return 'rook'
  if (minors > 0) return 'minor'
  return 'pawn'
}

export function materialOf(fen: string, side: 'w' | 'b'): number {
  const board = new Chess(fen)
  let total = 0
  for (const row of board.board()) {
    for (const piece of row) {
      if (!piece || piece.type === 'k') continue
      if (piece.color === side) total += VALUE[piece.type]
    }
  }
  return total
}

/**
 * How much material (pawn units) this ply gives up.
 * Counts tradedown on the move and hanging the piece you just moved.
 */
export function materialSacrificeAmount(
  fenBefore: string,
  fenAfter: string,
  mover: 'w' | 'b',
  movedTo?: string,
): number {
  const before = materialImbalance(fenBefore, mover)
  const after = materialImbalance(fenAfter, mover)
  let amount = Math.max(0, before - after)

  if (!movedTo) return amount

  try {
    const board = new Chess(fenAfter)
    const takes = board
      .moves({ verbose: true })
      .filter((m) => m.captured && m.to === movedTo)
    for (const m of takes) {
      board.move(m)
      const next = materialImbalance(board.fen(), mover)
      board.undo()
      amount = Math.max(amount, Math.max(0, after - next))
    }
  } catch {
    /* ignore illegal / transient fen issues */
  }
  return amount
}

/** Chess.com: more generous piece-sac definition for lower-rated players. */
export function sacrificeMinPawns(rating: number | null | undefined): number {
  if (rating == null) return 2
  if (rating < 1100) return 1
  if (rating < 1600) return 2
  return 3
}

/**
 * True when this ply is a material sacrifice (Chess.com-style !! signal).
 * Own-piece count alone never drops on your move (you keep the piece you move),
 * so we use relative imbalance + whether the piece you moved can be taken for a net loss.
 */
export function isMaterialSacrifice(
  fenBefore: string,
  fenAfter: string,
  mover: 'w' | 'b',
  movedTo?: string,
  rating?: number | null,
): boolean {
  return materialSacrificeAmount(fenBefore, fenAfter, mover, movedTo) >= sacrificeMinPawns(rating)
}

/** Side material minus opponent, in pawn units (no king). */
export function materialImbalance(fen: string, side: 'w' | 'b'): number {
  return materialOf(fen, side) - materialOf(fen, side === 'w' ? 'b' : 'w')
}
