import {
  emptyClockStats,
  emptyColorStats,
  emptyPhaseStats,
  type BucketStats,
  type ClockStats,
  type ColorStats,
  type GameAnalysis,
  type PhaseStats,
} from './types'

export type PeriodRollup = {
  periodStart: string
  periodEnd: string
  totalMoves: number
  blunderPct: number
  mistakePct: number
  byPhase: PhaseStats
  byColor: ColorStats
  byClock: ClockStats
}

function addBucket(into: BucketStats, from: BucketStats) {
  into.total += from.total
  into.blunder += from.blunder
  into.mistake += from.mistake
  into.inaccuracy += from.inaccuracy
}

export function monthBounds(isoDate: string): { start: string; end: string } {
  const [y, m] = isoDate.split('-').map(Number)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { start, end }
}

export function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 1000) / 10
}

export function rollupGames(games: GameAnalysis[], start: string, end: string): PeriodRollup {
  const byPhase = emptyPhaseStats()
  const byColor = emptyColorStats()
  const byClock = emptyClockStats()
  let totalMoves = 0
  let blunders = 0
  let mistakes = 0

  for (const game of games) {
    totalMoves += game.totalMoves
    blunders += game.blunderCount
    mistakes += game.mistakeCount
    addBucket(byColor[game.color], {
      total: game.totalMoves,
      blunder: game.blunderCount,
      mistake: game.mistakeCount,
      inaccuracy: game.inaccuracyCount,
    })
    for (const phase of ['opening', 'middlegame', 'endgame'] as const) {
      addBucket(byPhase[phase], game.phaseStats[phase])
    }
    for (const bucket of ['lt30', '30_60', 'gt60'] as const) {
      addBucket(byClock[bucket], game.clockStats[bucket])
    }
  }

  return {
    periodStart: start,
    periodEnd: end,
    totalMoves,
    blunderPct: pct(blunders, totalMoves),
    mistakePct: pct(mistakes, totalMoves),
    byPhase,
    byColor,
    byClock,
  }
}

export function mergeGameLists(games: GameAnalysis[]): Map<string, GameAnalysis[]> {
  const byMonth = new Map<string, GameAnalysis[]>()
  for (const game of games) {
    const { start } = monthBounds(game.playedOn)
    const list = byMonth.get(start) ?? []
    list.push(game)
    byMonth.set(start, list)
  }
  return byMonth
}
