import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import { COMMENTARY_GENERATOR_VERSION, type CommentaryEvidence, type MoveCommentary } from './types'
import { fPawnBlocked } from './explainMove'

const PIECE_WORD: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

const KNIGHT_DELTAS: Array<[number, number]> = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
]
const KING_DELTAS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]
const BISHOP_RAYS: Array<[number, number]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]
const ROOK_RAYS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

const SQUARE_RE = /^[a-h][1-8]$/

export function isBoardSquare(value: string): boolean {
  return SQUARE_RE.test(value)
}

function xy(square: Square): [number, number] {
  return [square.charCodeAt(0) - 97, Number(square[1]) - 1]
}

function at(x: number, y: number): Square | null {
  if (x < 0 || x > 7 || y < 0 || y > 7) return null
  return `${String.fromCharCode(97 + x)}${y + 1}` as Square
}

function pieceWord(type: PieceSymbol): string {
  return PIECE_WORD[type]
}

function describeUnit(type: PieceSymbol, square: Square): string {
  return `${pieceWord(type)} on ${square}`
}

function rayHits(board: Chess, from: Square, deltas: Array<[number, number]>): Square[] {
  const hits: Square[] = []
  const [fx, fy] = xy(from)
  for (const [dx, dy] of deltas) {
    let x = fx + dx
    let y = fy + dy
    while (true) {
      const square = at(x, y)
      if (!square) break
      const occupant = board.get(square)
      hits.push(square)
      if (occupant) break
      x += dx
      y += dy
    }
  }
  return hits
}

export function attackedSquares(board: Chess, from: Square): Square[] {
  const piece = board.get(from)
  if (!piece) return []
  const [fx, fy] = xy(from)
  if (piece.type === 'n') {
    return KNIGHT_DELTAS.map(([dx, dy]) => at(fx + dx, fy + dy)).filter(
      (square): square is Square => Boolean(square),
    )
  }
  if (piece.type === 'k') {
    return KING_DELTAS.map(([dx, dy]) => at(fx + dx, fy + dy)).filter(
      (square): square is Square => Boolean(square),
    )
  }
  if (piece.type === 'p') {
    const dir = piece.color === 'w' ? 1 : -1
    return [at(fx - 1, fy + dir), at(fx + 1, fy + dir)].filter(
      (square): square is Square => Boolean(square),
    )
  }
  if (piece.type === 'b') return rayHits(board, from, BISHOP_RAYS)
  if (piece.type === 'r') return rayHits(board, from, ROOK_RAYS)
  return rayHits(board, from, [...BISHOP_RAYS, ...ROOK_RAYS])
}

function openedSliders(before: Chess, after: Chess, color: Color): string[] {
  const opens: string[] = []
  const home = color === 'w' ? (['c1', 'f1', 'd1', 'a1', 'h1'] as Square[]) : (['c8', 'f8', 'd8', 'a8', 'h8'] as Square[])
  for (const square of home) {
    const piece = after.get(square)
    if (!piece || piece.color !== color) continue
    if (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q') continue
    if (attackedSquares(after, square).length > attackedSquares(before, square).length) {
      opens.push(`${piece.type === 'q' ? 'Q' : piece.type === 'r' ? 'R' : 'B'}${square}`)
    }
  }
  return opens
}

function fBreakLabel(color: Color): string {
  return color === 'w' ? 'f2–f4' : 'f7–f5'
}

function legalPawnBreaks(board: Chess, color: Color): string[] {
  const rows: string[] = []
  const prefix = color === 'w' ? '' : '...'
  for (const [home, dest] of color === 'w'
    ? [
        ['d2', 'd4'],
        ['e2', 'e4'],
        ['c2', 'c4'],
        ['f2', 'f4'],
      ]
    : [
        ['d7', 'd5'],
        ['e7', 'e5'],
        ['c7', 'c5'],
        ['f7', 'f5'],
      ]) {
    const pawn = board.get(home as Square)
    if (!pawn || pawn.type !== 'p' || pawn.color !== color) continue
    if (dest[0] === 'f' && fPawnBlocked(board, color)) continue
    const clone = new Chess(board.fen())
    let played = null
    try {
      played = clone.move(dest)
    } catch {
      played = null
    }
    if (played) rows.push(`${prefix}${dest}`)
  }
  return rows
}

function blockedPawnBreaks(board: Chess, color: Color): string[] {
  const blocked: string[] = []
  if (fPawnBlocked(board, color)) blocked.push(fBreakLabel(color))
  return blocked
}

function centerSquares(): Square[] {
  return ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5']
}

function developedCount(board: Chess, color: Color): number {
  let n = 0
  const back = color === 'w' ? '1' : '8'
  for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
    const square = `${file}${back}` as Square
    const piece = board.get(square)
    if (piece && piece.color === color && piece.type !== 'k' && piece.type !== 'p') n += 1
  }
  return 7 - n
}

export function positionPhase(board: Chess, ply: number): string {
  const minorsLeft =
    developedCount(board, 'w') + developedCount(board, 'b') < 6 ? 'opening' : 'middlegame'
  if (ply <= 10) return 'opening'
  if (ply >= 20) return minorsLeft === 'opening' ? 'late opening' : 'early middlegame'
  return ply >= 16 ? 'late opening' : 'opening'
}

export function commentaryKey(ply: number, san: string): string {
  return `${ply}:${san}`
}

export function gatherMoveEvidence(
  before: Chess,
  san: string,
  ply: number,
): CommentaryEvidence | null {
  const clone = new Chess(before.fen())
  const played = clone.move(san)
  if (!played) return null
  const dest = played.to as Square
  const color = played.color
  const hits = attackedSquares(clone, dest)
  const attacks: string[] = []
  const defends: string[] = []
  const controls: string[] = []
  for (const square of hits) {
    const occupant = clone.get(square)
    if (!occupant) {
      if (centerSquares().includes(square)) controls.push(square)
      continue
    }
    if (occupant.color === color) defends.push(describeUnit(occupant.type, square))
    else attacks.push(describeUnit(occupant.type, square))
  }
  return {
    fen: clone.fen(),
    fen_before: before.fen(),
    san: played.san,
    ply,
    attacks: attacks.slice(0, 4),
    defends: defends.slice(0, 4),
    controls: [...new Set(controls)].slice(0, 4),
    opened: openedSliders(before, clone, color),
    blocked_breaks: blockedPawnBreaks(clone, color),
    legal_breaks: legalPawnBreaks(clone, color),
  }
}

export function emptyCommentary(
  evidence: CommentaryEvidence,
  why: string,
  extras: Partial<MoveCommentary> = {},
): MoveCommentary {
  return {
    why,
    confidence: extras.confidence ?? 'basic',
    provenance: extras.provenance ?? 'board',
    generator_version: extras.generator_version ?? COMMENTARY_GENERATOR_VERSION,
    evidence,
    ...extras,
  }
}

export { pieceWord, describeUnit, fBreakLabel }
