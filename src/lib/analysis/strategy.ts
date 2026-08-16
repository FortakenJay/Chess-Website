import { Chess, SQUARES, type Color, type Square } from 'chess.js'
import { LOSING_THRESHOLD, WINNING_THRESHOLD } from './moveClassifier'
import type { EndgameType, Side } from './types'
import {
  emptyAccuracyBucket,
  emptyEndgameAccuracyStats,
  emptyEndgameConversion,
  emptyEndgameEntryBucket,
  emptyStrategyGroup,
  emptyStrategyStats,
  type AccuracyBucket,
  type EndgameAccuracyStats,
  type EndgameConversion,
  type EndgameEntry,
  type EndgameTheme,
  type PositionStructure,
  type StrategyMetric,
  type StrategyStats,
} from './types'

const FILES = 'abcdefgh'
const VALUE: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
}

const STRATEGY_METRICS: StrategyMetric[] = [
  'activePiece',
  'attacking',
  'defending',
  'overall',
  'pawnStructure',
  'space',
]

const STRUCTURES: Array<'all' | PositionStructure> = ['all', 'open', 'closed', 'semi_closed']
const ENDGAME_THEMES: EndgameTheme[] = ['pawn', 'rook', 'queen', 'other', 'overall']

export type StrategyTheme = Exclude<StrategyMetric, 'overall'>

function opp(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

function sideColor(side: Side): Color {
  return side === 'white' ? 'w' : 'b'
}

function parseUci(uci: string): { from: Square; to: Square; promotion?: string } | null {
  if (!uci || uci === '0000' || uci === '(none)' || uci.length < 4) return null
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4 ? uci[4] : undefined,
  }
}

function tryMove(chess: Chess, uci: string) {
  const parsed = parseUci(uci)
  if (!parsed) return null
  try {
    return chess.move({
      from: parsed.from,
      to: parsed.to,
      promotion: (parsed.promotion as 'q' | 'r' | 'b' | 'n' | undefined) ?? 'q',
    })
  } catch {
    return null
  }
}

function coords(square: Square): [number, number] {
  return [FILES.indexOf(square[0]!), Number(square[1]) - 1]
}

function withTurn(fen: string, color: Color): Chess | null {
  const parts = fen.split(' ')
  if (parts.length < 4) return null
  parts[1] = color
  try {
    return new Chess(parts.join(' '))
  } catch {
    return null
  }
}

function pieceMobility(fen: string, square: Square, color: Color): number {
  const board = withTurn(fen, color)
  if (!board) return 0
  try {
    return board.moves({ square, verbose: true }).length
  } catch {
    return 0
  }
}

function kingSquare(chess: Chess, color: Color): Square | null {
  return chess.findPiece({ type: 'k', color })[0] ?? null
}

function inKingZone(square: Square, king: Square): boolean {
  const [sf, sr] = coords(square)
  const [kf, kr] = coords(king)
  return Math.abs(sf - kf) <= 1 && Math.abs(sr - kr) <= 1
}

function isHanging(chess: Chess, square: Square, owner: Color): boolean {
  const piece = chess.get(square)
  if (!piece || piece.color !== owner) return false
  return chess.attackers(square, opp(owner)).length > chess.attackers(square, owner).length
}

function hasHangingValuable(chess: Chess, owner: Color): boolean {
  for (const square of SQUARES) {
    const piece = chess.get(square)
    if (!piece || piece.color !== owner || piece.type === 'k' || piece.type === 'p') continue
    if (isHanging(chess, square, owner)) return true
  }
  return false
}

function pawnFileCounts(chess: Chess, color: Color): number[] {
  const files = [0, 0, 0, 0, 0, 0, 0, 0]
  for (const square of SQUARES) {
    const piece = chess.get(square)
    if (!piece || piece.type !== 'p' || piece.color !== color) continue
    files[square.charCodeAt(0) - 97]! += 1
  }
  return files
}

export function pawnWeakness(chess: Chess, color: Color) {
  const files = pawnFileCounts(chess, color)
  let doubled = 0
  let isolated = 0
  let islands = 0
  let inIsland = false
  for (let file = 0; file < 8; file++) {
    const count = files[file]!
    if (count >= 2) doubled += count - 1
    if (count > 0) {
      const left = file > 0 ? files[file - 1]! : 0
      const right = file < 7 ? files[file + 1]! : 0
      if (left === 0 && right === 0) isolated += count
      if (!inIsland) {
        islands += 1
        inIsland = true
      }
    } else {
      inIsland = false
    }
  }
  return { doubled, isolated, islands }
}

function weaknessChanged(
  before: ReturnType<typeof pawnWeakness>,
  after: ReturnType<typeof pawnWeakness>,
) {
  return (
    before.doubled !== after.doubled ||
    before.isolated !== after.isolated ||
    before.islands !== after.islands
  )
}

export function classifyPositionStructure(fen: string): PositionStructure {
  let board: Chess
  try {
    board = new Chess(fen)
  } catch {
    return 'semi_closed'
  }

  const white: Square[] = []
  const black: Square[] = []
  const occupiedFiles = new Set<number>()
  for (const square of SQUARES) {
    const piece = board.get(square)
    if (!piece || piece.type !== 'p') continue
    occupiedFiles.add(square.charCodeAt(0) - 97)
    if (piece.color === 'w') white.push(square)
    else black.push(square)
  }

  const openFiles = 8 - occupiedFiles.size
  const blackSet = new Set(black)
  let locked = 0
  for (const square of white) {
    const [file, rank] = coords(square)
    const ahead = `${FILES[file]}${rank + 2}` as Square
    if (blackSet.has(ahead)) locked += 1
    if (file < 2 || file > 5 || rank < 2 || rank > 4) continue
    const left = `${FILES[file - 1]}${rank + 2}` as Square
    const right = `${FILES[file + 1]}${rank + 2}` as Square
    if (file > 0 && blackSet.has(left)) locked += 1
    if (file < 7 && blackSet.has(right)) locked += 1
  }

  if (openFiles >= 2 && locked <= 1) return 'open'
  if (openFiles <= 1 && locked >= 2) return 'closed'
  return 'semi_closed'
}

export function classifyStrategyThemes(input: {
  fenBefore: string
  bestUci: string | null | undefined
  side: Side
}): StrategyTheme[] {
  const color = sideColor(input.side)
  let before: Chess
  try {
    before = new Chess(input.fenBefore)
  } catch {
    return []
  }

  const themes: StrategyTheme[] = []
  if (before.isCheck() || hasHangingValuable(before, color)) {
    themes.push('defending')
  }

  const after = new Chess(input.fenBefore)
  const played = input.bestUci ? tryMove(after, input.bestUci) : null
  if (!played) return themes

  const enemyKing = kingSquare(before, opp(color))
  if (
    Boolean(played.captured) ||
    after.isCheck() ||
    (enemyKing != null && inKingZone(played.to, enemyKing))
  ) {
    themes.push('attacking')
  }

  if (played.piece !== 'p') {
    const beforeMobility = pieceMobility(input.fenBefore, played.from, color)
    const afterMobility = pieceMobility(after.fen(), played.to, color)
    const backRank = color === 'w' ? '1' : '8'
    const leftBackRank = played.from[1] === backRank && played.to[1] !== backRank
    if (afterMobility > beforeMobility || leftBackRank) {
      themes.push('activePiece')
    }
  }

  if (played.piece === 'p') {
    const tactical = Boolean(played.captured) || after.isCheck()
    if (!tactical || weaknessChanged(pawnWeakness(before, color), pawnWeakness(after, color))) {
      themes.push('pawnStructure')
    }
  }

  const toRank = Number(played.to[1])
  const inOppHalf = color === 'w' ? toRank >= 5 : toRank <= 4
  if (inOppHalf && !isHanging(after, played.to, color)) {
    themes.push('space')
  }

  return themes
}

export function addAccuracy(bucket: AccuracyBucket, accuracy: number) {
  bucket.moves += 1
  bucket.squaredError += (100 - accuracy) ** 2
}

export function mergeAccuracy(into: AccuracyBucket, from: AccuracyBucket) {
  into.moves += from.moves
  into.squaredError += from.squaredError
}

export function accuracyFromBucket(bucket: AccuracyBucket): number | null {
  if (bucket.moves <= 0) return null
  return Math.round((100 - Math.sqrt(bucket.squaredError / bucket.moves)) * 10) / 10
}

export function recordStrategyMove(
  stats: StrategyStats,
  structure: PositionStructure,
  themes: StrategyTheme[],
  accuracy: number,
) {
  if (themes.length === 0) return
  const metrics = new Set<StrategyMetric>(themes)
  metrics.add('overall')
  for (const metric of metrics) {
    addAccuracy(stats.all[metric], accuracy)
    addAccuracy(stats[structure][metric], accuracy)
  }
}

export function endgameThemeOf(type: EndgameType): Exclude<EndgameTheme, 'overall'> {
  if (type === 'pawn' || type === 'rook' || type === 'queen') return type
  return 'other'
}

export function recordEndgameAccuracy(
  stats: EndgameAccuracyStats,
  type: EndgameType,
  accuracy: number,
) {
  addAccuracy(stats[endgameThemeOf(type)], accuracy)
  addAccuracy(stats.overall, accuracy)
}

export function classifyEndgameEntry(expectedPoints: number): EndgameEntry {
  if (expectedPoints >= WINNING_THRESHOLD) return 'better'
  if (expectedPoints <= LOSING_THRESHOLD) return 'worse'
  return 'equal'
}

export function applyEndgameResult(
  conversion: EndgameConversion,
  entry: EndgameEntry | null,
  entryEp: number,
  result: 'win' | 'loss' | 'draw',
): EndgameConversion {
  if (!entry) return conversion
  const bucket = conversion[entry]
  bucket.games += 1
  if (result === 'win') bucket.wins += 1
  else if (result === 'draw') bucket.draws += 1
  else bucket.losses += 1
  bucket.expectedScore += entryEp
  return conversion
}

function parseBucket(raw: unknown): AccuracyBucket {
  if (!raw || typeof raw !== 'object') return emptyAccuracyBucket()
  const row = raw as { moves?: unknown; squaredError?: unknown }
  return {
    moves: Number(row.moves) || 0,
    squaredError: Number(row.squaredError) || 0,
  }
}

function parseGroup(raw: unknown) {
  const group = emptyStrategyGroup()
  if (!raw || typeof raw !== 'object') return group
  const row = raw as Partial<Record<StrategyMetric, unknown>>
  for (const metric of STRATEGY_METRICS) {
    group[metric] = parseBucket(row[metric])
  }
  return group
}

export function parseStrategyStats(raw: unknown): StrategyStats {
  const stats = emptyStrategyStats()
  if (!raw || typeof raw !== 'object') return stats
  const row = raw as Partial<Record<'all' | PositionStructure, unknown>>
  for (const structure of STRUCTURES) {
    stats[structure] = parseGroup(row[structure])
  }
  return stats
}

export function parseEndgameAccuracyStats(raw: unknown): EndgameAccuracyStats {
  const stats = emptyEndgameAccuracyStats()
  if (!raw || typeof raw !== 'object') return stats
  const row = raw as Partial<Record<EndgameTheme, unknown>>
  for (const theme of ENDGAME_THEMES) {
    stats[theme] = parseBucket(row[theme])
  }
  return stats
}

function parseEntryBucket(raw: unknown) {
  const bucket = emptyEndgameEntryBucket()
  if (!raw || typeof raw !== 'object') return bucket
  const row = raw as Partial<Record<keyof typeof bucket, unknown>>
  bucket.games = Number(row.games) || 0
  bucket.wins = Number(row.wins) || 0
  bucket.draws = Number(row.draws) || 0
  bucket.losses = Number(row.losses) || 0
  bucket.expectedScore = Number(row.expectedScore) || 0
  return bucket
}

export function parseEndgameConversion(raw: unknown): EndgameConversion {
  const conversion = emptyEndgameConversion()
  if (!raw || typeof raw !== 'object') return conversion
  const row = raw as Partial<EndgameConversion>
  conversion.opportunities = Number(row.opportunities) || 0
  conversion.conversions = Number(row.conversions) || 0
  conversion.better = parseEntryBucket(row.better)
  conversion.equal = parseEntryBucket(row.equal)
  conversion.worse = parseEntryBucket(row.worse)
  return conversion
}

export function mergeStrategyStats(into: StrategyStats, from: StrategyStats) {
  for (const structure of STRUCTURES) {
    for (const metric of STRATEGY_METRICS) {
      mergeAccuracy(into[structure][metric], from[structure][metric])
    }
  }
}

export function mergeEndgameAccuracy(into: EndgameAccuracyStats, from: EndgameAccuracyStats) {
  for (const theme of ENDGAME_THEMES) {
    mergeAccuracy(into[theme], from[theme])
  }
}

export function mergeEndgameConversion(into: EndgameConversion, from: EndgameConversion) {
  into.opportunities += from.opportunities
  into.conversions += from.conversions
  for (const entry of ['better', 'equal', 'worse'] as const) {
    const dest = into[entry]
    const src = from[entry]
    dest.games += src.games
    dest.wins += src.wins
    dest.draws += src.draws
    dest.losses += src.losses
    dest.expectedScore += src.expectedScore
  }
}

export function winPct(bucket: { wins: number; games: number }): number | null {
  if (bucket.games <= 0) return null
  return Math.round((bucket.wins / bucket.games) * 1000) / 10
}
