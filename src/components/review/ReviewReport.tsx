import type { GameAnalysis, MoveQuality, Phase } from '@/lib/analysis/types'
import {
  buildScorecard,
  coachGrade,
  COACH_LABEL,
  gameRatingFromAccuracy,
  phaseAccuracy,
  phaseAccuracyFromPlies,
  phaseGrade,
  type CoachGrade,
} from '@/lib/analysis/reportStats'
import { emptyQualityStats } from '@/lib/analysis/types'
import { QUALITY_COLOR } from '@/lib/analysis/formatEval'
import { btnPrimary } from '@/components/review/reviewUi'
import { cn } from '@/lib/cn'

const PHASES: Phase[] = ['opening', 'middlegame', 'endgame']

function coachTone(grade: CoachGrade) {
  if (grade === 'great' || grade === 'good') return 'bg-[#81b64c] text-canvas'
  if (grade === 'average') return 'bg-[#f5a524] text-canvas'
  return 'bg-blunder text-ink'
}

function PhaseIcon({ grade }: { grade: MoveQuality | 'none' }) {
  if (grade === 'none') {
    return <span className="font-mono text-[11px] text-muted">—</span>
  }
  const symbol =
    grade === 'brilliant'
      ? '!!'
      : grade === 'best'
        ? '★'
        : grade === 'excellent'
          ? '!'
          : grade === 'good'
            ? '✓'
            : grade === 'inaccuracy'
              ? '?!'
              : grade === 'mistake'
                ? '?'
                : '??'
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10px] text-canvas"
      style={{ backgroundColor: QUALITY_COLOR[grade] }}
    >
      {symbol}
    </span>
  )
}

export function ReviewReport({
  analysis,
  onStartReview,
}: {
  analysis: GameAnalysis
  onStartReview: () => void
}) {
  // Always put the reviewed player on the left so accuracy isn't confusing.
  const youName = analysis.username
  const oppName = analysis.opponent
  const youStats = { ...emptyQualityStats(), ...analysis.qualityStats }
  const oppStats = { ...emptyQualityStats(), ...(analysis.opponentQualityStats ?? {}) }
  const youAcc = analysis.accuracyPct
  const oppAcc = analysis.opponentAccuracyPct ?? 0

  const youRating = gameRatingFromAccuracy(youAcc, analysis.userRating)
  const oppRating = gameRatingFromAccuracy(oppAcc, analysis.opponentRating)
  const youCoach = coachGrade({
    accuracyPct: youAcc,
    blunderCount: analysis.blunderCount,
    mistakeCount: analysis.mistakeCount,
  })
  const oppCoach = coachGrade({
    accuracyPct: oppAcc,
    blunderCount: oppStats.blunder,
    mistakeCount: oppStats.mistake,
  })

  const scorecard = buildScorecard(youStats, oppStats)
  const mistakeFocus = analysis.mistakeCount + analysis.blunderCount

  return (
    <div className="mx-auto flex max-h-[calc(100dvh-9rem)] max-w-md flex-col overflow-hidden border border-line bg-surface">
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-end gap-2 border-b border-line px-3 py-2.5">
        <div className="min-w-0 text-left">
          <p className="truncate font-mono text-[10px] uppercase tracking-wider text-[#e8c547]">You</p>
          <p className="truncate font-mono text-xs text-muted" translate="no">
            {youName}
          </p>
          <p className="mt-1 inline-block border border-line bg-ink px-2.5 py-1 font-mono text-xl text-canvas tabular">
            {youAcc.toFixed(1)}
          </p>
        </div>
        <span className="pb-2 font-mono text-[10px] uppercase tracking-wider text-muted">vs</span>
        <div className="min-w-0 text-right">
          <p className="truncate font-mono text-[10px] uppercase tracking-wider text-muted">Opp</p>
          <p className="truncate font-mono text-xs text-muted" translate="no">
            {oppName}
          </p>
          <p className="mt-1 inline-block border border-line bg-surface-2 px-2.5 py-1 font-mono text-xl tabular">
            {oppAcc.toFixed(1)}
          </p>
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto divide-y divide-line">
        {scorecard.map((row) => (
          <li
            key={row.quality}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-1 px-3 py-1.5"
          >
            <span className="font-mono text-sm tabular">{row.you}</span>
            <span className="flex items-center justify-center gap-1.5 text-xs">
              <span
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[9px] text-canvas"
                style={{ backgroundColor: row.color }}
              >
                {row.symbol}
              </span>
              <span className="text-muted">{row.label}</span>
            </span>
            <span className="text-right font-mono text-sm tabular">{row.opponent}</span>
          </li>
        ))}
      </ul>

      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-line px-3 py-2">
        <p className="font-mono text-lg tabular">{youRating}</p>
        <p className="font-mono text-[9px] uppercase tracking-wider text-muted">Game rating</p>
        <p className="text-right font-mono text-lg tabular">{oppRating}</p>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-line px-3 py-2">
        <div className="text-center">
          <span
            className={cn(
              'inline-block px-3 py-1 font-mono text-[10px] uppercase tracking-wider',
              coachTone(youCoach),
            )}
          >
            {COACH_LABEL[youCoach]}
          </span>
        </div>
        <div className="text-center">
          <span
            className={cn(
              'inline-block px-3 py-1 font-mono text-[10px] uppercase tracking-wider',
              coachTone(oppCoach),
            )}
          >
            {COACH_LABEL[oppCoach]}
          </span>
        </div>
      </div>

      <div className="shrink-0 space-y-1.5 border-t border-line px-3 py-2">
        {PHASES.map((phase) => {
          const youAccPhase =
            phaseAccuracyFromPlies(analysis.plies, phase, true) ??
            phaseAccuracy(analysis.phaseAcpl, phase)
          const oppAccPhase =
            phaseAccuracyFromPlies(analysis.plies, phase, false) ??
            (analysis.opponentPhaseAcpl
              ? phaseAccuracy(analysis.opponentPhaseAcpl, phase)
              : null)
          const youBlunders = analysis.phaseStats[phase].blunder
          const oppBlunders = analysis.opponentPhaseStats?.[phase].blunder ?? 0
          return (
            <div key={phase} className="grid grid-cols-[2rem_1fr_2rem] items-center gap-1">
              <div className="flex justify-start">
                <PhaseIcon grade={phaseGrade(youAccPhase, youBlunders)} />
              </div>
              <p className="text-center font-mono text-[10px] uppercase tracking-wider text-muted">
                {phase}
              </p>
              <div className="flex justify-end">
                <PhaseIcon grade={phaseGrade(oppAccPhase, oppBlunders)} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="shrink-0 border-t border-line p-3">
        <button
          type="button"
          onClick={onStartReview}
          className={cn(btnPrimary, 'w-full px-4 py-2.5 text-sm')}
        >
          Start review
        </button>
        <p className="mt-2 flex items-center justify-center gap-2 text-xs text-muted">
          Learn from your mistakes
          {mistakeFocus > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center bg-mistake px-1 font-mono text-[10px] text-canvas">
              {mistakeFocus}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  )
}
