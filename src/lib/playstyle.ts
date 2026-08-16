import { accuracyFromBucket } from '@/lib/analysis/strategy'
import type { PositionStructure, StrategyStats } from '@/lib/analysis/types'
import { strategyFromGames } from '@/lib/strategyStats'
import { pct } from '@/lib/analysis/summarize'
import { errorRate, motifKindSplit, normalizeTimeClass, timeClassStats } from '@/lib/stats'
import type { ClockStats, ColorStats } from '@/lib/analysis/types'
import type { Tables } from '@/lib/supabase/database.types'

export const STRUCTURE_LABEL: Record<PositionStructure, string> = {
  open: 'Open',
  closed: 'Closed',
  semi_closed: 'Semi-closed',
}

const STRUCTURES: PositionStructure[] = ['open', 'closed', 'semi_closed']
const MIN_STRUCTURE_MOVES = 40
const MIN_COLOR_MOVES = 40
const MIN_METRIC_MOVES = 40
const MIN_CLOCK_MOVES = 30
const MIN_MOTIF_FLAGS = 12
const MIN_TIME_CLASS_GAMES = 5
const MIN_ERROR_GAP = 2
const MIN_ACCURACY_GAP = 3
const MIN_MOTIF_SHARE = 60

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function rateLabel(value: number) {
  return `${round1(value).toFixed(1)}%`
}

export type StructurePlay = {
  id: PositionStructure
  label: string
  accuracy: number | null
  moves: number
  vsOverallPct: number | null
}

export type PlaystyleTrait = {
  id: string
  label: string
  value: string
  detail: string
}

export type PlaystyleThrive = {
  best: PositionStructure
  versus: PositionStructure
  percentMore: number
}

export type Playstyle = {
  structures: StructurePlay[]
  thrive: PlaystyleThrive | null
  traits: PlaystyleTrait[]
}

function relativeMore(best: number, other: number): number | null {
  if (other <= 0) return null
  return Math.round(((best - other) / other) * 100)
}

export function playstyleFrom(
  games: Tables<'games'>[],
  positions: Tables<'flagged_positions'>[],
  byColor: ColorStats,
  byClock: ClockStats,
): Playstyle | null {
  if (games.length === 0) return null

  const strategy: StrategyStats = strategyFromGames(games)
  const overallAcc = accuracyFromBucket(strategy.all.overall)
  const structures: StructurePlay[] = STRUCTURES.map((id) => {
    const bucket = strategy[id].overall
    const accuracy = bucket.moves >= MIN_STRUCTURE_MOVES ? accuracyFromBucket(bucket) : null
    const vsOverallPct =
      accuracy != null && overallAcc != null && overallAcc > 0
        ? relativeMore(accuracy, overallAcc)
        : null
    return {
      id,
      label: STRUCTURE_LABEL[id],
      accuracy,
      moves: bucket.moves,
      vsOverallPct,
    }
  })

  const ranked = structures
    .filter((row): row is StructurePlay & { accuracy: number } => row.accuracy != null)
    .sort((a, b) => b.accuracy - a.accuracy)

  let thrive: PlaystyleThrive | null = null
  if (ranked.length >= 2) {
    const best = ranked[0]!
    const versus = ranked[ranked.length - 1]!
    const percentMore = relativeMore(best.accuracy, versus.accuracy)
    if (percentMore != null && percentMore >= 3 && best.id !== versus.id) {
      thrive = { best: best.id, versus: versus.id, percentMore }
    }
  }

  const traits: PlaystyleTrait[] = []

  const whiteErr = byColor.white.total >= MIN_COLOR_MOVES ? errorRate(byColor.white) : null
  const blackErr = byColor.black.total >= MIN_COLOR_MOVES ? errorRate(byColor.black) : null
  if (whiteErr != null && blackErr != null) {
    const gap = round1(Math.abs(whiteErr - blackErr))
    if (gap >= MIN_ERROR_GAP) {
      const whiteCleaner = whiteErr < blackErr
      traits.push({
        id: 'color',
        label: whiteCleaner ? 'Cleaner as White' : 'Cleaner as Black',
        value: `${gap.toFixed(1)} pt`,
        detail: `Blunder/mistake rate ${rateLabel(whiteErr)} as White, ${rateLabel(blackErr)} as Black.`,
      })
    }
  }

  const attack = accuracyFromBucket(strategy.all.attacking)
  const defend = accuracyFromBucket(strategy.all.defending)
  if (
    strategy.all.attacking.moves >= MIN_METRIC_MOVES &&
    strategy.all.defending.moves >= MIN_METRIC_MOVES &&
    attack != null &&
    defend != null &&
    round1(Math.abs(attack - defend)) >= MIN_ACCURACY_GAP
  ) {
    const attacking = attack > defend
    traits.push({
      id: 'attack',
      label: attacking ? 'Attacker' : 'Defender',
      value: rateLabel(attacking ? attack : defend),
      detail: `Attacking accuracy ${rateLabel(attack)} vs defending ${rateLabel(defend)}.`,
    })
  }

  const pawn = accuracyFromBucket(strategy.all.pawnStructure)
  const space = accuracyFromBucket(strategy.all.space)
  if (
    strategy.all.pawnStructure.moves >= MIN_METRIC_MOVES &&
    strategy.all.space.moves >= MIN_METRIC_MOVES &&
    pawn != null &&
    space != null &&
    round1(Math.abs(pawn - space)) >= MIN_ACCURACY_GAP
  ) {
    const structureFirst = pawn > space
    traits.push({
      id: 'plan',
      label: structureFirst ? 'Structure first' : 'Space first',
      value: rateLabel(structureFirst ? pawn : space),
      detail: `Pawn-structure accuracy ${rateLabel(pawn)} vs space ${rateLabel(space)}.`,
    })
  }

  const scramble = byClock.lt30.total >= MIN_CLOCK_MOVES ? errorRate(byClock.lt30) : null
  const plenty = byClock.gt60.total >= MIN_CLOCK_MOVES ? errorRate(byClock.gt60) : null
  if (scramble != null && plenty != null && round1(scramble - plenty) >= MIN_ERROR_GAP) {
    traits.push({
      id: 'clock',
      label: 'Leaks in time trouble',
      value: rateLabel(scramble),
      detail: `Error rate ${rateLabel(scramble)} with under 30s left, ${rateLabel(plenty)} with over a minute.`,
    })
  }

  const motifs = motifKindSplit(positions)
  const motifTotal = motifs.omission + motifs.commission
  if (motifTotal >= MIN_MOTIF_FLAGS) {
    const omissionShare = pct(motifs.omission, motifTotal)
    const commissionShare = pct(motifs.commission, motifTotal)
    const majority = Math.max(omissionShare, commissionShare)
    if (majority >= MIN_MOTIF_SHARE) {
      const missesMore = omissionShare > commissionShare
      traits.push({
        id: 'tactics',
        label: missesMore ? 'Misses more than hangs' : 'Hangs more than misses',
        value: rateLabel(majority),
        detail: missesMore
          ? `${rateLabel(omissionShare)} of tagged leaks are missed tactics, not a move you played.`
          : `${rateLabel(commissionShare)} of tagged leaks are a move you played.`,
      })
    }
  }

  const classes = timeClassStats(games).filter((row) => row.games >= MIN_TIME_CLASS_GAMES)
  if (classes.length >= 2) {
    const cleanest = [...classes].sort((a, b) => a.errorPct - b.errorPct)[0]!
    const busiest = classes[0]!
    const gap = round1(busiest.errorPct - cleanest.errorPct)
    if (cleanest.name === busiest.name || gap >= MIN_ERROR_GAP) {
      traits.push({
        id: 'speed',
        label: `Cleanest in ${normalizeTimeClass(cleanest.name)}`,
        value: rateLabel(cleanest.errorPct),
        detail:
          cleanest.name === busiest.name
            ? `Lowest blunder/mistake rate in ${cleanest.name} (${cleanest.games} games).`
            : `You play ${busiest.name} most, but ${cleanest.name} is cleaner.`,
      })
    }
  }

  const hasSignal = thrive != null || ranked.length > 0 || traits.length > 0
  if (!hasSignal) return null

  return { structures, thrive, traits }
}

export function thriveCopy(playstyle: Playstyle): string | null {
  if (!playstyle.thrive) {
    const ready = playstyle.structures.filter((row) => row.accuracy != null)
    if (ready.length >= 2) {
      return 'Those center types play about even.'
    }
    return null
  }
  const { best, versus, percentMore } = playstyle.thrive
  return `You thrive ${percentMore}% more on ${STRUCTURE_LABEL[best].toLowerCase()} positions than ${STRUCTURE_LABEL[versus].toLowerCase()}.`
}
