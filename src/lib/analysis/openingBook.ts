import positions from './openingBookPositions.json'

export const BOOK_MAX_MOVE = 10

let positionSet: Set<string> | null = null

function bookPositions() {
  positionSet ??= new Set(positions)
  return positionSet
}

/**
 * A move is Book when its resulting position occurs in the ECO move database.
 * Position-only FEN supports transpositions while avoiding clock/EP mismatches.
 */
export function isBookMove(fenAfter: string, moveNumber: number): boolean {
  if (moveNumber > BOOK_MAX_MOVE) return false
  const position = fenAfter.split(' ')[0]
  return Boolean(position && bookPositions().has(position))
}
