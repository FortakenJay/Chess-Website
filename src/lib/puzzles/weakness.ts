import { errorRate, inTimeframe, sumPhaseStats, type Timeframe } from '@/lib/stats'
import type { Motif, Phase } from '@/lib/analysis/types'
import type { PuzzleFilters, PuzzleFocus, PuzzleRatingBand } from './types'

export function weakestPhaseInGames(
  games: Array<{ played_on: string; phase_stats?: unknown }>,
): { phase: Phase; errorPct: number } | null {
  const byPhase = sumPhaseStats(games as never)
  let best: { phase: Phase; errorPct: number } | null = null
  for (const phase of ['opening', 'middlegame', 'endgame'] as const) {
    const bucket = byPhase[phase]
    if (bucket.total < 6) continue
    const rate = errorRate(bucket)
    if (!best || rate > best.errorPct) best = { phase, errorPct: rate }
  }
  return best
}

export function weakestPhaseThisMonth(
  games: Array<{ played_on: string; phase_stats?: unknown }>,
) {
  return weakestPhaseInGames(games)
}

export function weakestPhaseForTimeframe(
  games: Array<{ played_on: string; phase_stats?: unknown }>,
  timeframe: Timeframe,
) {
  return weakestPhaseInGames(games.filter((game) => inTimeframe(game.played_on, timeframe)))
}

export const EMPTY_PUZZLE_FILTERS: PuzzleFilters = {
  phase: '',
  motif: '',
  color: '',
  source: '',
  ratingBand: 'suited',
  ratingMin: '',
  ratingMax: '',
  focus: 'suited_elo',
}

export function ratingWindowForElo(
  elo: number | null | undefined,
  band: PuzzleRatingBand,
): { min: number | null; max: number | null } {
  if (elo == null || band === 'any') return { min: null, max: null }
  if (band === 'easier') return { min: Math.max(400, elo - 350), max: elo - 50 }
  if (band === 'harder') return { min: elo + 50, max: elo + 400 }
  // suited
  return { min: Math.max(400, elo - 150), max: elo + 150 }
}

export function filtersFromFocus(
  focus: PuzzleFocus,
  games: Array<{ played_on: string; phase_stats?: unknown }>,
  elo: number | null,
  base: PuzzleFilters = EMPTY_PUZZLE_FILTERS,
): PuzzleFilters {
  const next: PuzzleFilters = {
    ...base,
    focus,
    phase: '',
    ratingBand: base.ratingBand || 'suited',
  }

  if (focus === 'opening' || focus === 'middlegame' || focus === 'endgame') {
    next.phase = focus
  }
  if (focus === 'this_week') {
    const weak = weakestPhaseForTimeframe(games, 'week')
    if (weak) next.phase = weak.phase
    next.ratingBand = 'suited'
  }
  if (focus === 'this_month') {
    const weak = weakestPhaseForTimeframe(games, 'month')
    if (weak) next.phase = weak.phase
    next.ratingBand = 'suited'
  }
  if (focus === 'suited_elo') {
    next.ratingBand = 'suited'
    const weak = weakestPhaseForTimeframe(games, 'month')
    if (weak) next.phase = weak.phase
  }

  if (elo != null && next.ratingBand !== 'any') {
    const window = ratingWindowForElo(elo, next.ratingBand)
    next.ratingMin = window.min ?? ''
    next.ratingMax = window.max ?? ''
  }

  return next
}

export function filtersFromWeakness(
  games: Array<{ played_on: string; phase_stats?: unknown }>,
  elo: number | null = null,
  base: PuzzleFilters = EMPTY_PUZZLE_FILTERS,
): PuzzleFilters {
  return filtersFromFocus('suited_elo', games, elo, base)
}

export function resolveRatingBounds(
  filters: PuzzleFilters,
  elo: number | null,
): { min: number | null; max: number | null } {
  if (filters.ratingMin !== '' || filters.ratingMax !== '') {
    return {
      min: filters.ratingMin === '' ? null : Number(filters.ratingMin),
      max: filters.ratingMax === '' ? null : Number(filters.ratingMax),
    }
  }
  return ratingWindowForElo(elo, filters.ratingBand)
}

export type { Motif, Phase }
