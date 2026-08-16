import {
  accuracyFromBucket,
  mergeEndgameAccuracy,
  mergeEndgameConversion,
  mergeStrategyStats,
  parseEndgameAccuracyStats,
  parseEndgameConversion,
  parseStrategyStats,
  winPct,
} from '@/lib/analysis/strategy'
import {
  emptyEndgameAccuracyStats,
  emptyEndgameConversion,
  emptyStrategyStats,
  type EndgameAccuracyStats,
  type EndgameConversion,
  type PositionStructure,
  type StrategyStats,
} from '@/lib/analysis/types'
import { normalizeTimeClass } from '@/lib/stats'
import type { Tables } from '@/lib/supabase/database.types'

export const CANONICAL_TIME_CLASSES = ['bullet', 'blitz', 'rapid', 'daily'] as const

export type TimeClassFilter = 'all' | string
export type StructureFilter = 'all' | PositionStructure

export function filterGamesByTimeClass(
  games: Tables<'games'>[],
  timeClass: TimeClassFilter,
) {
  if (timeClass === 'all') return games
  return games.filter((game) => normalizeTimeClass(game.time_class) === timeClass)
}

export function timeClassFilterOptions(games: Tables<'games'>[]) {
  const present = new Set(games.map((game) => normalizeTimeClass(game.time_class)))
  const options: Array<{ value: TimeClassFilter; label: string }> = [
    { value: 'all', label: 'Overall' },
  ]
  for (const key of CANONICAL_TIME_CLASSES) {
    if (present.has(key)) {
      options.push({ value: key, label: key[0]!.toUpperCase() + key.slice(1) })
    }
  }
  for (const key of [...present].sort()) {
    if ((CANONICAL_TIME_CLASSES as readonly string[]).includes(key)) continue
    if (key === 'unknown') {
      options.push({ value: key, label: 'Other' })
      continue
    }
    options.push({ value: key, label: key })
  }
  return options
}

export function strategyFromGames(
  games: Tables<'games'>[],
): StrategyStats {
  const stats = emptyStrategyStats()
  for (const game of games) {
    mergeStrategyStats(stats, parseStrategyStats(game.strategy_stats))
  }
  return stats
}

export function endgameAccuracyFromGames(
  games: Tables<'games'>[],
): EndgameAccuracyStats {
  const stats = emptyEndgameAccuracyStats()
  for (const game of games) {
    mergeEndgameAccuracy(stats, parseEndgameAccuracyStats(game.endgame_accuracy_stats))
  }
  return stats
}

export function endgameConversionFromGames(
  games: Tables<'games'>[],
): EndgameConversion {
  const conversion = emptyEndgameConversion()
  for (const game of games) {
    mergeEndgameConversion(conversion, parseEndgameConversion(game.endgame_conversion))
  }
  return conversion
}

export { accuracyFromBucket, winPct }
