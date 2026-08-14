import type { ClockStats, ColorStats, Motif, Phase, PhaseStats, Side } from './analysis/types'
import { pct } from './analysis/summarize'
import type { Tables } from './supabase/database.types'

export type Timeframe = 'week' | 'month' | 'year' | 'all'

export const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  week: 'This week',
  month: 'This month',
  year: 'This year',
  all: 'All time',
}

export function timeframeStart(timeframe: Timeframe, now = new Date()): string | null {
  if (timeframe === 'all') return null
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  if (timeframe === 'week') {
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  } else if (timeframe === 'month') {
    date.setUTCDate(1)
  } else {
    date.setUTCMonth(0, 1)
  }
  return date.toISOString().slice(0, 10)
}

export function inTimeframe(date: string, timeframe: Timeframe, now = new Date()) {
  const start = timeframeStart(timeframe, now)
  return !start || date.slice(0, 10) >= start
}

export function gameTrend(games: Tables<'games'>[], timeframe: Timeframe) {
  const daily = timeframe === 'week' || timeframe === 'month'
  const buckets = new Map<string, { errors: number; blunders: number; moves: number }>()
  for (const game of games) {
    const key = daily ? game.played_on : game.played_on.slice(0, 7)
    const current = buckets.get(key) ?? { errors: 0, blunders: 0, moves: 0 }
    current.errors += game.blunder_count + game.mistake_count
    current.blunders += game.blunder_count
    current.moves += game.total_moves
    buckets.set(key, current)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      errorPct: pct(value.errors, value.moves),
      blunderPct: pct(value.blunders, value.moves),
    }))
}

export type Headline = {
  phase: Phase
  errorPct: number
  sample: number
  topMotif: Motif | null
  motifShare: number
}

export function errorRate(bucket: { total: number; blunder: number; mistake: number }) {
  return pct(bucket.blunder + bucket.mistake, bucket.total)
}

export function headlineFrom(
  byPhase: PhaseStats,
  positions: Tables<'flagged_positions'>[],
): Headline | null {
  const phases: Phase[] = ['opening', 'middlegame', 'endgame']
  let best: Headline | null = null
  for (const phase of phases) {
    const bucket = byPhase[phase]
    if (bucket.total < 8) continue
    const rate = errorRate(bucket)
    if (!best || rate > best.errorPct) {
      best = { phase, errorPct: rate, sample: bucket.total, topMotif: null, motifShare: 0 }
    }
  }
  if (!best) return null

  const blunders = positions.filter((p) => p.classification === 'blunder' && p.motif)
  const counts = new Map<Motif, number>()
  for (const row of blunders) {
    const motif = row.motif as Motif
    counts.set(motif, (counts.get(motif) ?? 0) + 1)
  }
  let top: Motif | null = null
  let topCount = 0
  for (const [motif, count] of counts) {
    if (count > topCount) {
      top = motif
      topCount = count
    }
  }
  if (top && blunders.length > 0) {
    best.topMotif = top
    best.motifShare = pct(topCount, blunders.length)
  }
  return best
}

export function sumPhaseStats(games: Tables<'games'>[]): PhaseStats {
  const empty = (): PhaseStats => ({
    opening: { total: 0, blunder: 0, mistake: 0, inaccuracy: 0 },
    middlegame: { total: 0, blunder: 0, mistake: 0, inaccuracy: 0 },
    endgame: { total: 0, blunder: 0, mistake: 0, inaccuracy: 0 },
  })
  const out = empty()
  for (const game of games) {
    const stats = game.phase_stats as unknown as PhaseStats
    for (const phase of ['opening', 'middlegame', 'endgame'] as const) {
      const src = stats?.[phase]
      if (!src) continue
      out[phase].total += src.total
      out[phase].blunder += src.blunder
      out[phase].mistake += src.mistake
      out[phase].inaccuracy += src.inaccuracy
    }
  }
  return out
}

export function sumColorStats(games: Tables<'games'>[]): ColorStats {
  const out: ColorStats = {
    white: { total: 0, blunder: 0, mistake: 0, inaccuracy: 0 },
    black: { total: 0, blunder: 0, mistake: 0, inaccuracy: 0 },
  }
  for (const game of games) {
    const color = game.color as Side
    out[color].total += game.total_moves
    out[color].blunder += game.blunder_count
    out[color].mistake += game.mistake_count
    out[color].inaccuracy += game.inaccuracy_count
  }
  return out
}

export function sumClockStats(games: Tables<'games'>[]): ClockStats {
  const out: ClockStats = {
    lt30: { total: 0, blunder: 0, mistake: 0, inaccuracy: 0 },
    '30_60': { total: 0, blunder: 0, mistake: 0, inaccuracy: 0 },
    gt60: { total: 0, blunder: 0, mistake: 0, inaccuracy: 0 },
  }
  for (const game of games) {
    const stats = game.clock_stats as unknown as ClockStats
    for (const key of ['lt30', '30_60', 'gt60'] as const) {
      const src = stats?.[key]
      if (!src) continue
      out[key].total += src.total
      out[key].blunder += src.blunder
      out[key].mistake += src.mistake
      out[key].inaccuracy += src.inaccuracy
    }
  }
  return out
}

export function winRateByBlunders(games: Tables<'games'>[]) {
  const buckets = {
    zero: { games: 0, wins: 0 },
    one: { games: 0, wins: 0 },
    twoPlus: { games: 0, wins: 0 },
  }
  for (const game of games) {
    const key = game.blunder_count === 0 ? 'zero' : game.blunder_count === 1 ? 'one' : 'twoPlus'
    buckets[key].games += 1
    if (game.result === 'win') buckets[key].wins += 1
  }
  return buckets
}

export function drillWeekly(attempts: Tables<'drill_attempts'>[]) {
  const weeks = new Map<string, { total: number; solved: number }>()
  for (const row of attempts) {
    const d = new Date(row.attempted_at)
    const day = d.getUTCDay()
    const monday = new Date(d)
    monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7))
    const key = monday.toISOString().slice(0, 10)
    const cur = weeks.get(key) ?? { total: 0, solved: 0 }
    cur.total += 1
    if (row.matched_best) cur.solved += 1
    weeks.set(key, cur)
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({ week, solvedPct: pct(v.solved, v.total), total: v.total }))
}

export const MOTIF_LABEL: Record<Motif, string> = {
  hanging_piece: 'Hanging piece',
  fork: 'Fork',
  pin: 'Pin',
  skewer: 'Skewer',
  discovered_attack: 'Discovered attack',
  back_rank: 'Back rank',
  missed_mate: 'Missed mate',
}

export const PHASE_LABEL: Record<Phase, string> = {
  opening: 'Opening',
  middlegame: 'Middlegame',
  endgame: 'Endgame',
}
