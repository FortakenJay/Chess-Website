import type {
  ClockStats,
  ColorStats,
  EndgameType,
  EndgameTypeStats,
  Motif,
  MoveQuality,
  Phase,
  PhaseStats,
  QualityStats,
  Side,
} from './analysis/types'
import { emptyEndgameStats, emptyQualityStats, isOmissionMotif } from './analysis/types'
import { pct } from './analysis/summarize'
import type { Tables } from './supabase/database.types'

export type Timeframe = 'today' | 'week' | 'month' | 'year' | 'all'

export const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  year: 'This year',
  all: 'All time',
}

export function timeframeStart(timeframe: Timeframe, now = new Date()): string | null {
  if (timeframe === 'all') return null
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  if (timeframe === 'today') {
    // already at UTC midnight today
  } else if (timeframe === 'week') {
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
  const daily = timeframe === 'today' || timeframe === 'week' || timeframe === 'month'
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

export function accuracyTrend(games: Tables<'games'>[], timeframe: Timeframe) {
  const daily = timeframe === 'today' || timeframe === 'week' || timeframe === 'month'
  const buckets = new Map<string, { acplSum: number; accSum: number; games: number }>()
  for (const game of games) {
    const key = daily ? game.played_on : game.played_on.slice(0, 7)
    const current = buckets.get(key) ?? { acplSum: 0, accSum: 0, games: 0 }
    current.acplSum += Number(game.acpl) || 0
    current.accSum += Number(game.accuracy_pct) || 0
    current.games += 1
    buckets.set(key, current)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      acpl: value.games ? Math.round((value.acplSum / value.games) * 10) / 10 : 0,
      accuracy: value.games ? Math.round((value.accSum / value.games) * 10) / 10 : 0,
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
  const out: PhaseStats = {
    opening: { total: 0, blunder: 0, mistake: 0, inaccuracy: 0 },
    middlegame: { total: 0, blunder: 0, mistake: 0, inaccuracy: 0 },
    endgame: { total: 0, blunder: 0, mistake: 0, inaccuracy: 0 },
  }
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

export function sumQualityStats(games: Tables<'games'>[]): QualityStats {
  const out = emptyQualityStats()
  for (const game of games) {
    const stats = game.quality_stats as unknown as QualityStats
    if (!stats) continue
    for (const key of Object.keys(out) as MoveQuality[]) {
      out[key] += Number(stats[key]) || 0
    }
  }
  return out
}

export function sumEndgameStats(games: Tables<'games'>[]): EndgameTypeStats {
  const out = emptyEndgameStats()
  for (const game of games) {
    const stats = game.endgame_stats as unknown as EndgameTypeStats
    if (!stats) continue
    for (const key of Object.keys(out) as EndgameType[]) {
      const src = stats[key]
      if (!src) continue
      out[key].total += src.total
      out[key].blunder += src.blunder
      out[key].mistake += src.mistake
      out[key].inaccuracy += src.inaccuracy
    }
  }
  return out
}

export function endgameConversionRate(games: Tables<'games'>[]) {
  let opportunities = 0
  let conversions = 0
  for (const game of games) {
    const row = game.endgame_conversion as { opportunities?: number; conversions?: number } | null
    opportunities += Number(row?.opportunities) || 0
    conversions += Number(row?.conversions) || 0
  }
  return { opportunities, conversions, rate: pct(conversions, opportunities) }
}

export function recoveryRate(games: Tables<'games'>[]) {
  let moves = 0
  let errors = 0
  for (const game of games) {
    const row = game.recovery_stats as { moves?: number; errors?: number } | null
    moves += Number(row?.moves) || 0
    errors += Number(row?.errors) || 0
  }
  return { moves, errors, errorPct: pct(errors, moves) }
}

export function phaseAcplAvg(games: Tables<'games'>[]) {
  const out: Record<Phase, { totalLoss: number; moves: number }> = {
    opening: { totalLoss: 0, moves: 0 },
    middlegame: { totalLoss: 0, moves: 0 },
    endgame: { totalLoss: 0, moves: 0 },
  }
  for (const game of games) {
    const stats = game.phase_acpl as Record<Phase, { totalLoss?: number; moves?: number }> | null
    if (!stats) continue
    for (const phase of ['opening', 'middlegame', 'endgame'] as const) {
      out[phase].totalLoss += Number(stats[phase]?.totalLoss) || 0
      out[phase].moves += Number(stats[phase]?.moves) || 0
    }
  }
  return (['opening', 'middlegame', 'endgame'] as const).map((phase) => ({
    phase,
    acpl: out[phase].moves
      ? Math.round((out[phase].totalLoss / out[phase].moves) * 10) / 10
      : 0,
  }))
}

export function openingRepertoire(games: Tables<'games'>[]) {
  type Acc = {
    eco: string
    name: string
    games: number
    wins: number
    errors: number
    moves: number
  }
  const refined = new Map<string, Acc>()
  for (const game of games) {
    const eco = game.opening_eco || '—'
    const name = game.opening_name || eco
    const key = `${eco}|${name}`
    const opening = (game.phase_stats as unknown as PhaseStats)?.opening
    const cur = refined.get(key) ?? {
      eco,
      name,
      games: 0,
      wins: 0,
      errors: 0,
      moves: 0,
    }
    cur.games += 1
    if (game.result === 'win') cur.wins += 1
    if (opening) {
      cur.errors += opening.blunder + opening.mistake
      cur.moves += opening.total
    }
    refined.set(key, cur)
  }
  return [...refined.values()]
    .map((row) => ({
      eco: row.eco,
      name: row.name,
      games: row.games,
      winPct: pct(row.wins, row.games),
      errorPct: pct(row.errors, row.moves),
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 12)
}

export function timeClassStats(games: Tables<'games'>[]) {
  const map = new Map<string, { games: number; errors: number; moves: number }>()
  for (const game of games) {
    const key = normalizeTimeClass(game.time_class)
    const cur = map.get(key) ?? { games: 0, errors: 0, moves: 0 }
    cur.games += 1
    cur.errors += game.blunder_count + game.mistake_count
    cur.moves += game.total_moves
    map.set(key, cur)
  }
  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      games: v.games,
      errorPct: pct(v.errors, v.moves),
    }))
    .sort((a, b) => b.games - a.games)
}

export function opponentRatingBandStats(games: Tables<'games'>[]) {
  const bands = [
    { name: '−200+', min: -Infinity, max: -200 },
    { name: '−199 to −50', min: -199, max: -50 },
    { name: '±49', min: -49, max: 49 },
    { name: '+50 to +199', min: 50, max: 199 },
    { name: '+200+', min: 200, max: Infinity },
  ]
  return bands.map((band) => {
    let gamesN = 0
    let errors = 0
    let moves = 0
    for (const game of games) {
      if (game.user_rating == null || game.opponent_rating == null) continue
      const diff = game.opponent_rating - game.user_rating
      if (diff < band.min || diff > band.max) continue
      gamesN += 1
      errors += game.blunder_count + game.mistake_count
      moves += game.total_moves
    }
    return { name: band.name, games: gamesN, errorPct: pct(errors, moves) }
  })
}

export function normalizeTimeClass(value: string | null | undefined) {
  const raw = (value || 'unknown').toLowerCase()
  if (raw.includes('bullet') || raw === '60' || raw.startsWith('1|')) return 'bullet'
  if (raw.includes('blitz') || raw.startsWith('3|') || raw.startsWith('5|')) return 'blitz'
  if (raw.includes('rapid') || raw.startsWith('10|') || raw.startsWith('15|')) return 'rapid'
  if (raw.includes('daily') || raw.includes('correspondence')) return 'daily'
  return raw.length > 18 ? `${raw.slice(0, 18)}…` : raw
}

export function motifKindSplit(positions: Tables<'flagged_positions'>[]) {
  let omission = 0
  let commission = 0
  for (const row of positions) {
    if (row.motif_kind === 'omission' || isOmissionMotif(row.motif as Motif)) omission += 1
    else if (row.motif) commission += 1
  }
  return { omission, commission }
}

export function drillAccuracyByMotif(
  positions: Tables<'flagged_positions'>[],
  attempts: Tables<'drill_attempts'>[],
) {
  const byId = new Map(positions.map((p) => [p.id, p]))
  const map = new Map<string, { total: number; solved: number }>()
  for (const attempt of attempts) {
    const pos = byId.get(attempt.position_id)
    const motif = pos?.motif || 'untagged'
    const cur = map.get(motif) ?? { total: 0, solved: 0 }
    cur.total += 1
    if (attempt.matched_best) cur.solved += 1
    map.set(motif, cur)
  }
  return [...map.entries()]
    .map(([motif, v]) => ({
      motif,
      label: MOTIF_LABEL[motif as Motif] ?? motif,
      solvedPct: pct(v.solved, v.total),
      total: v.total,
    }))
    .sort((a, b) => b.total - a.total)
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
  missed_fork: 'Missed fork',
  missed_pin: 'Missed pin',
  missed_skewer: 'Missed skewer',
  missed_discovered_attack: 'Missed discovered',
  missed_hanging_piece: 'Missed hanging win',
  missed_back_rank: 'Missed back rank',
}

/** Filter order: omissions first (Missed mate at top), then commissions. */
export const ALL_MOTIFS: Motif[] = [
  'missed_mate',
  'missed_fork',
  'missed_pin',
  'missed_skewer',
  'missed_discovered_attack',
  'missed_hanging_piece',
  'missed_back_rank',
  'hanging_piece',
  'fork',
  'pin',
  'skewer',
  'discovered_attack',
  'back_rank',
]

export const PHASE_LABEL: Record<Phase, string> = {
  opening: 'Opening',
  middlegame: 'Middlegame',
  endgame: 'Endgame',
}

export const ENDGAME_LABEL: Record<EndgameType, string> = {
  pawn: 'Pawn',
  minor: 'Minor piece',
  rook: 'Rook',
  queen: 'Queen',
  mixed: 'Mixed',
}

export const QUALITY_LABEL: Record<MoveQuality, string> = {
  brilliant: 'Brilliant',
  great: 'Great',
  book: 'Book',
  best: 'Best',
  excellent: 'Excellent',
  good: 'Good',
  miss: 'Miss',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
}
