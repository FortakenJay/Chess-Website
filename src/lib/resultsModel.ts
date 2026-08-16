import { useMemo } from 'react'
import {
  accuracyTrend,
  dateKey,
  drillAccuracyByMotif,
  drillWeekly,
  endgameConversionRate,
  gameTrend,
  headlineFrom,
  inTimeframe,
  motifKindSplit,
  opponentRatingBandStats,
  phaseAcplAvg,
  recoveryRate,
  sumClockStats,
  sumColorStats,
  sumEndgameStats,
  sumPhaseStats,
  sumQualityStats,
  timeClassStats,
  timeframeStart,
  winRateByBlunders,
  type Timeframe,
} from '@/lib/stats'
import type { Tables } from '@/lib/supabase/database.types'

export function useResultsModel(
  games: Tables<'games'>[],
  positions: Tables<'flagged_positions'>[],
  attempts: Tables<'drill_attempts'>[],
  timeframe: Timeframe,
) {
  return useMemo(() => {
    const filteredGames = games.filter((game) => inTimeframe(game.played_on, timeframe))
    const filteredPositions = positions.filter((position) =>
      inTimeframe(position.played_on, timeframe),
    )
    const filteredAttempts = attempts.filter((attempt) =>
      inTimeframe(attempt.attempted_at, timeframe),
    )
    const byPhase = sumPhaseStats(filteredGames)
    const latestGames = [...filteredGames].sort((a, b) => {
      const byDate = dateKey(b.played_on).localeCompare(dateKey(a.played_on))
      return byDate || a.game_link.localeCompare(b.game_link)
    })

    return {
      filteredGames,
      latestGames,
      rangeStart: timeframeStart(timeframe),
      filteredPositions,
      filteredAttempts,
      byPhase,
      headline: headlineFrom(byPhase, filteredPositions),
      motifKind: motifKindSplit(filteredPositions),
      quality: sumQualityStats(filteredGames),
      accuracyPoints: accuracyTrend(filteredGames, timeframe),
      phaseAcpl: phaseAcplAvg(filteredGames),
      trendPoints: gameTrend(filteredGames, timeframe),
      endgame: sumEndgameStats(filteredGames),
      endgameConversion: endgameConversionRate(filteredGames),
      recovery: recoveryRate(filteredGames),
      winRate: winRateByBlunders(filteredGames),
      timeClass: timeClassStats(filteredGames),
      ratingBands: opponentRatingBandStats(filteredGames),
      byColor: sumColorStats(filteredGames),
      byClock: sumClockStats(filteredGames),
      drillWeeks: drillWeekly(filteredAttempts),
      drillByMotif: drillAccuracyByMotif(filteredPositions, filteredAttempts),
    }
  }, [attempts, games, positions, timeframe])
}

export type ResultsModel = ReturnType<typeof useResultsModel>
