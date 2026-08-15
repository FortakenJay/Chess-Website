import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import type { EngineEval, EngineLine, MoveQuality, Side } from './types'

export const LOSING_THRESHOLD = 0.35
export const EQUAL_THRESHOLD = 0.65
export const WINNING_THRESHOLD = 0.65

const PIECE_CP: Record<Exclude<PieceSymbol, 'k'>, number> = {
  p: 100,
  n: 300,
  b: 320,
  r: 500,
  q: 900,
}

const EP_EPSILON = 1e-6

export type BaseMoveQuality =
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'

export type BrilliantGateResult = {
  brilliant: boolean
  failedGate: 1 | 2 | 3 | 4 | 5 | 6 | null
  sacrificeValue: number
}

function moverColor(side: Side): Color {
  return side === 'white' ? 'w' : 'b'
}

export function cpForMover(whiteRelativeCp: number, mover: Side): number {
  return mover === 'white' ? whiteRelativeCp : -whiteRelativeCp
}

/** Expected points from an engine result, normalized to the original mover. */
export function expectedPoints(result: Pick<EngineEval, 'cp' | 'mate'>, mover: Side): number {
  if (result.mate != null && result.mate !== 0) {
    const mateForMover = mover === 'white' ? result.mate : -result.mate
    return mateForMover > 0 ? 1 : 0
  }
  const cp = Math.max(-10_000, Math.min(10_000, cpForMover(result.cp, mover)))
  const winPct = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
  return winPct / 100
}

export function expectedPointsLost(
  before: Pick<EngineEval, 'cp' | 'mate'>,
  after: Pick<EngineEval, 'cp' | 'mate'>,
  mover: Side,
): number {
  return Math.max(0, expectedPoints(before, mover) - expectedPoints(after, mover))
}

export function classifyExpectedPoints(epLost: number): BaseMoveQuality {
  if (epLost <= EP_EPSILON) return 'best'
  if (epLost <= 0.02) return 'excellent'
  if (epLost <= 0.05) return 'good'
  if (epLost <= 0.1) return 'inaccuracy'
  if (epLost <= 0.2) return 'mistake'
  return 'blunder'
}

export function leakClassification(
  quality: BaseMoveQuality,
): 'fine' | 'inaccuracy' | 'mistake' | 'blunder' {
  if (quality === 'inaccuracy' || quality === 'mistake' || quality === 'blunder') {
    return quality
  }
  return 'fine'
}

/** Standard centipawn material balance for one side. */
export function materialBalanceCp(board: Chess, side: Color): number {
  let mine = 0
  let theirs = 0
  for (const row of board.board()) {
    for (const piece of row) {
      if (!piece || piece.type === 'k') continue
      const value = PIECE_CP[piece.type]
      if (piece.color === side) mine += value
      else theirs += value
    }
  }
  return mine - theirs
}

function playUci(board: Chess, uci: string) {
  if (uci.length < 4) return null
  try {
    return board.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: (uci[4] as 'q' | 'r' | 'b' | 'n' | undefined) ?? undefined,
    })
  } catch {
    return null
  }
}

export function minimumSacrificeValue(rating: number | null | undefined): number {
  if ((rating ?? 1600) < 1000) return 100
  return 280
}

/**
 * Detect a real, persistent sacrifice. Immediate recapture sequences that
 * restore material within two plies are trades and return zero.
 */
export function persistentSacrificeValue(input: {
  fenBefore: string
  playedUci: string
  mover: Side
  pvAfter: string[]
}): number {
  const board = new Chess(input.fenBefore)
  const side = moverColor(input.mover)
  const preBalance = materialBalanceCp(board, side)
  const beforeParts = input.fenBefore.split(' ')
  beforeParts[1] = side === 'w' ? 'b' : 'w'
  beforeParts[3] = '-'
  let capturesBefore = new Set<string>()
  try {
    const opponentToMove = new Chess(beforeParts.join(' '))
    capturesBefore = new Set(
      opponentToMove
        .moves({ verbose: true })
        .filter((move) => move.captured)
        .map((move) => `${move.to}:${move.captured}`),
    )
  } catch {
    // A malformed synthetic FEN should not make classification fail.
  }
  const played = playUci(board, input.playedUci)
  if (!played) return 0

  const afterBalance = materialBalanceCp(board, side)
  const movedTo = played.to
  const movedValue = played.piece === 'k' ? 0 : PIECE_CP[played.piece]
  const allCaptures = board.moves({ verbose: true }).filter((move) => move.captured)
  const legalCaptures = allCaptures.filter((move) => move.to === movedTo)
  const newlyAvailableCaptures = allCaptures.filter(
    (move) => !capturesBefore.has(`${move.to}:${move.captured}`),
  )
  const movedPieceEnPrise = legalCaptures.length > 0 && movedValue >= 300
  const valuablePieceEnPrise = newlyAvailableCaptures.some((move) => {
    if (!move.captured || move.captured === 'k') return false
    return PIECE_CP[move.captured] >= 300
  })
  const captureIntoRecapture = Boolean(played.captured && legalCaptures.length)
  const immediateMaterialGiveaway = preBalance - afterBalance > 0
  if (
    !movedPieceEnPrise &&
    !valuablePieceEnPrise &&
    !captureIntoRecapture &&
    !immediateMaterialGiveaway
  ) return 0

  const balances = [afterBalance]
  for (const uci of input.pvAfter) {
    if (!playUci(board, uci)) break
    balances.push(materialBalanceCp(board, side))
  }

  // Also price the legal capture of the moved piece when the PV declines it.
  let potentialCaptureDeficit = 0
  const sacrificeCaptures = [
    ...legalCaptures,
    ...newlyAvailableCaptures.filter(
      (move) => !legalCaptures.some((candidate) => candidate.lan === move.lan),
    ),
  ]
  if (sacrificeCaptures.length) {
    const captureBoard = new Chess(played.after)
    for (const capture of sacrificeCaptures) {
      try {
        captureBoard.move(capture)
        potentialCaptureDeficit = Math.max(
          potentialCaptureDeficit,
          preBalance - materialBalanceCp(captureBoard, side),
        )
        captureBoard.undo()
      } catch {
        // Ignore stale verbose moves.
      }
    }
  }

  let maxDeficit = Math.max(0, potentialCaptureDeficit)
  let firstDeficitPly = -1
  for (let ply = 0; ply < balances.length; ply++) {
    const deficit = preBalance - balances[ply]!
    if (deficit > maxDeficit) maxDeficit = deficit
    if (firstDeficitPly < 0 && deficit >= 100) firstDeficitPly = ply
  }
  if (firstDeficitPly < 0 && maxDeficit < 100) return 0

  // Material coming straight back is a trade, not a persistent sacrifice.
  if (firstDeficitPly >= 0) {
    const recoveryEnd = Math.min(balances.length - 1, firstDeficitPly + 2)
    for (let ply = firstDeficitPly + 1; ply <= recoveryEnd; ply++) {
      if (balances[ply]! >= preBalance - 50) return 0
    }
  }

  return Math.max(0, maxDeficit)
}

function pvHasMinimumHorizonOrEndsGame(
  fenBefore: string,
  playedUci: string,
  pvAfter: string[],
): boolean {
  if (pvAfter.length >= 8) return true
  const board = new Chess(fenBefore)
  if (!playUci(board, playedUci)) return false
  for (const uci of pvAfter) {
    if (!playUci(board, uci)) return false
  }
  return board.isGameOver()
}

function candidateEp(line: EngineLine, mover: Side): number {
  return expectedPoints({ cp: line.cp, mate: line.mate }, mover)
}

export function isGreatMove(input: {
  epBefore: number
  epAfter: number
  candidates: EngineLine[]
  mover: Side
}): boolean {
  const crossedBoundary =
    (input.epBefore < LOSING_THRESHOLD && input.epAfter >= EQUAL_THRESHOLD) ||
    (input.epBefore < EQUAL_THRESHOLD && input.epAfter >= WINNING_THRESHOLD)
  if (crossedBoundary) return true

  const secondBest = input.candidates[1]
  return (
    input.epAfter >= LOSING_THRESHOLD &&
    Boolean(secondBest && candidateEp(secondBest, input.mover) < LOSING_THRESHOLD)
  )
}

export function isMiss(input: {
  previousOpponentEpLost: number | null
  epBefore: number
  epAfter: number
}): boolean {
  return (
    (input.previousOpponentEpLost ?? 0) >= 0.1 &&
    input.epBefore >= WINNING_THRESHOLD &&
    input.epAfter < WINNING_THRESHOLD
  )
}

export function evaluateBrilliantGates(input: {
  fenBefore: string
  playedUci: string
  mover: Side
  rating: number | null | undefined
  evalBeforeCp: number
  evalAfterCp: number
  bestCp: number
  candidates: EngineLine[]
  pvAfter: string[]
}): BrilliantGateResult {
  const playedLoss = Math.max(0, input.bestCp - input.evalAfterCp)
  if (playedLoss > 15) return { brilliant: false, failedGate: 1, sacrificeValue: 0 }

  const highRated = (input.rating ?? 1600) > 1600
  const winningLimit = highRated ? 100 : 200
  if (input.evalBeforeCp >= winningLimit) {
    return { brilliant: false, failedGate: highRated ? 6 : 2, sacrificeValue: 0 }
  }
  if (input.evalAfterCp < -50) {
    return { brilliant: false, failedGate: 3, sacrificeValue: 0 }
  }

  if (!pvHasMinimumHorizonOrEndsGame(input.fenBefore, input.playedUci, input.pvAfter)) {
    return { brilliant: false, failedGate: 4, sacrificeValue: 0 }
  }

  const sacrificeValue = persistentSacrificeValue({
    fenBefore: input.fenBefore,
    playedUci: input.playedUci,
    mover: input.mover,
    pvAfter: input.pvAfter,
  })
  if (sacrificeValue < minimumSacrificeValue(input.rating)) {
    return { brilliant: false, failedGate: 4, sacrificeValue }
  }

  const closeMoves = input.candidates.filter(
    (line) => input.bestCp - cpForMover(line.cp, input.mover) <= 15,
  ).length
  if (closeMoves >= 3) {
    return { brilliant: false, failedGate: 5, sacrificeValue }
  }

  return { brilliant: true, failedGate: null, sacrificeValue }
}

export function applyMoveOverrides(input: {
  base: BaseMoveQuality
  isBook: boolean
  great: boolean
  miss: boolean
  brilliant: boolean
}): MoveQuality {
  if (input.isBook) return 'book'
  if (input.brilliant && ['best', 'excellent', 'good'].includes(input.base)) {
    return 'brilliant'
  }
  if (input.miss) return 'miss'
  if (input.great) return 'great'
  return input.base
}
