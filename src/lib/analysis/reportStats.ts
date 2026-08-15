import { accuracyFromAcpl, averageAccuracy } from './classify'
import { phaseOf } from './phase'
import type {
  AnalyzedPly,
  GameAnalysis,
  MoveQuality,
  Phase,
  PhaseAcpl,
  QualityStats,
} from './types'
import { emptyQualityStats } from './types'

export type CoachGrade = 'great' | 'good' | 'average' | 'bad' | 'poor'

export type ScorecardRow = {
  quality: MoveQuality
  label: string
  symbol: string
  color: string
  you: number
  opponent: number
}

const SCORECARD: Array<{
  quality: MoveQuality
  label: string
  symbol: string
  color: string
}> = [
  { quality: 'brilliant', label: 'Brilliant', symbol: '!!', color: '#1baca6' },
  { quality: 'great', label: 'Great', symbol: '!', color: '#81b64c' },
  { quality: 'book', label: 'Book', symbol: '♟', color: '#a78bfa' },
  { quality: 'best', label: 'Best', symbol: '★', color: '#81b64c' },
  { quality: 'excellent', label: 'Excellent', symbol: '!', color: '#95b776' },
  { quality: 'good', label: 'Good', symbol: '✓', color: '#b0b4bc' },
  { quality: 'miss', label: 'Miss', symbol: '✕', color: '#e5484d' },
  { quality: 'inaccuracy', label: 'Inaccuracy', symbol: '?!', color: '#e8c547' },
  { quality: 'mistake', label: 'Mistake', symbol: '?', color: '#f5a524' },
  { quality: 'blunder', label: 'Blunder', symbol: '??', color: '#e5484d' },
]

/** Rough performance Elo from accuracy, anchored to the player's rating. */
export function gameRatingFromAccuracy(
  accuracyPct: number,
  anchorRating: number | null,
): number {
  const base = anchorRating ?? 1200
  const delta = ((accuracyPct - 70) / 30) * 400
  return Math.max(100, Math.round(base + delta))
}

export function coachGrade(input: {
  accuracyPct: number
  blunderCount: number
  mistakeCount: number
}): CoachGrade {
  if (input.accuracyPct >= 90 && input.blunderCount === 0) return 'great'
  if (input.accuracyPct >= 80 && input.blunderCount <= 1) return 'good'
  if (input.accuracyPct >= 70) return 'average'
  if (input.accuracyPct >= 55) return 'bad'
  return 'poor'
}

export const COACH_LABEL: Record<CoachGrade, string> = {
  great: 'Great',
  good: 'Good',
  average: 'Average',
  bad: 'Bad',
  poor: 'Poor',
}

export function phaseAccuracy(phaseAcpl: PhaseAcpl, phase: Phase): number | null {
  const bucket = phaseAcpl[phase]
  if (!bucket.moves) return null
  const acpl = bucket.totalLoss / bucket.moves
  return accuracyFromAcpl(acpl)
}

/** Prefer win%-based move accuracies from the ply tape when available. */
export function phaseAccuracyFromPlies(
  plies: AnalyzedPly[] | undefined,
  phase: Phase,
  forUser: boolean,
): number | null {
  if (!plies?.length) return null
  const scores: number[] = []
  for (const ply of plies) {
    if (ply.isUserMove !== forUser || ply.accuracy == null) continue
    if (phaseOf(ply.moveNumber, ply.fenBefore) !== phase) continue
    scores.push(ply.accuracy)
  }
  return scores.length ? averageAccuracy(scores) : null
}

export function phaseGrade(accuracy: number | null, blunders: number): MoveQuality | 'none' {
  if (accuracy == null) return 'none'
  if (blunders >= 2 || accuracy < 50) return 'blunder'
  if (blunders >= 1 || accuracy < 65) return 'mistake'
  if (accuracy < 75) return 'inaccuracy'
  if (accuracy >= 90) return 'best'
  if (accuracy >= 82) return 'excellent'
  return 'good'
}

export function buildScorecard(
  you: QualityStats,
  opponent: QualityStats | undefined,
): ScorecardRow[] {
  const opp = opponent ?? emptyQualityStats()
  return SCORECARD.map((row) => ({
    ...row,
    you: you[row.quality] ?? 0,
    opponent: opp[row.quality] ?? 0,
  }))
}

export function insightCopy(analysis: GameAnalysis): string {
  const phases: Phase[] = ['opening', 'middlegame', 'endgame']
  let worst: Phase | null = null
  let worstAcc = 101
  for (const phase of phases) {
    const acc =
      phaseAccuracyFromPlies(analysis.plies, phase, true) ??
      phaseAccuracy(analysis.phaseAcpl, phase)
    if (acc == null) continue
    if (acc < worstAcc) {
      worstAcc = acc
      worst = phase
    }
  }
  if (worst && worstAcc < 70) {
    return `Watch the ${worst}. It dragged well below your level this game.`
  }
  if (analysis.blunderCount >= 3) {
    return `Too many blunders (${analysis.blunderCount}). Slow down before the big decisions.`
  }
  if (analysis.accuracyPct >= 85) {
    return 'Clean game. Keep converting these positions the same way.'
  }
  return 'Solid enough — review the marked mistakes to climb faster.'
}

export function peerPercentile(accuracyPct: number): number {
  const t = (accuracyPct - 40) / 55
  const pct = Math.round(5 + Math.max(0, Math.min(1, t)) * 90)
  return pct
}

export function percentileLabel(pct: number): string {
  if (pct >= 70) return `top ${100 - pct}%`
  return `bottom ${pct}%`
}
