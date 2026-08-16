import { useMemo } from 'react'
import type { GameAnalysis, Phase } from '@/lib/analysis/types'
import {
  insightCopy,
  peerPercentile,
  percentileLabel,
  phaseAccuracy,
  phaseAccuracyFromPlies,
} from '@/lib/analysis/reportStats'
import { QUALITY_COLOR } from '@/lib/analysis/formatEval'
import { PHASE_LABEL } from '@/lib/stats'
import { cn } from '@/lib/cn'

function StandBar({
  label,
  percentile,
  warn,
}: {
  label: string
  percentile: number
  warn?: boolean
}) {
  const left = Math.max(4, Math.min(96, percentile))
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm">{label}</span>
        <span className={cn('font-mono text-xs', warn ? 'text-blunder-text' : 'text-inaccuracy')}>
          {percentileLabel(percentile)}
        </span>
      </div>
      <div className="relative h-2 bg-surface-2">
        <div
          className={cn('absolute inset-y-0 left-0', warn ? 'bg-blunder/50' : 'bg-inaccuracy/30')}
          style={{ width: `${left}%` }}
        />
        <span
          className={cn(
            'absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full',
            warn ? 'bg-blunder' : 'bg-inaccuracy',
          )}
          style={{ left: `calc(${left}% - 5px)` }}
        />
      </div>
    </div>
  )
}

function AccuracyChart({ analysis }: { analysis: GameAnalysis }) {
  const plies = analysis.plies ?? []
  const userPlies = plies.filter((p) => p.isUserMove && p.loss != null)
  const oppPlies = plies.filter((p) => !p.isUserMove && p.loss != null)
  if (userPlies.length < 2) return null

  const w = 360
  const h = 120
  const maxLoss = Math.max(50, ...userPlies.map((p) => p.loss ?? 0), ...oppPlies.map((p) => p.loss ?? 0))

  function points(
    rows: typeof userPlies,
  ): string {
    return rows
      .map((ply, i) => {
        const x = (i / Math.max(1, rows.length - 1)) * w
        const loss = ply.loss ?? 0
        // Higher on chart = better (lower loss)
        const y = 8 + ((loss / maxLoss) * (h - 16))
        return `${x},${y}`
      })
      .join(' ')
  }

  return (
    <div className="border border-line bg-surface-2 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-4 font-mono text-[11px]">
        <span className="text-inaccuracy">
          {analysis.username} · {analysis.accuracyPct.toFixed(1)}
        </span>
        <span className="text-muted">
          {analysis.opponent} · {(analysis.opponentAccuracyPct ?? 0).toFixed(1)}
        </span>
        <span className="text-blunder-text">blunders</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full" role="img" aria-label="Accuracy per move">
        <polyline fill="none" stroke="var(--color-fine)" strokeWidth="1.5" points={points(oppPlies)} />
        <polyline fill="none" stroke="var(--chart-secondary)" strokeWidth="2" points={points(userPlies)} />
        {userPlies.map((ply, i) => {
          if (ply.quality !== 'blunder') return null
          const x = (i / Math.max(1, userPlies.length - 1)) * w
          const y = 8 + (((ply.loss ?? 0) / maxLoss) * (h - 16))
          return <circle key={ply.ply} cx={x} cy={y} r="4" fill={QUALITY_COLOR.blunder} />
        })}
      </svg>
    </div>
  )
}

function phaseErrors(analysis: GameAnalysis, phase: Phase) {
  const bucket = analysis.phaseStats[phase]
  return bucket.blunder + bucket.mistake + bucket.inaccuracy
}

function slipCompare(yours: number, theirs: number | null): string | null {
  if (theirs == null || theirs <= 0) return null
  const ratio = yours / theirs
  if (ratio >= 1.8) return 'You gave away about twice as much as they did.'
  if (ratio >= 1.15) return 'You leaked more than they did this game.'
  if (ratio <= 0.55) return 'You were much cleaner than they were.'
  if (ratio <= 0.85) return 'You were cleaner than they were.'
  return 'You leaked about the same amount.'
}

function EngineStats({ analysis }: { analysis: GameAnalysis }) {
  const phases: Phase[] = ['opening', 'middlegame', 'endgame']
  const opp = analysis.opponentAcpl
  const note = slipCompare(analysis.acpl, opp ?? null)

  return (
    <section className="border border-line bg-surface p-4">
      <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Slip size</h3>
      <p className="mt-1 text-sm text-muted text-pretty">
        Average you give away each move, in hundredths of a pawn. Lower is cleaner.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-sm text-muted">You</p>
          <p className="mt-1 font-mono text-2xl tabular tracking-tight">{analysis.acpl}</p>
        </div>
        <div>
          <p className="text-sm text-muted">Opponent</p>
          <p className="mt-1 font-mono text-2xl tabular tracking-tight text-muted">
            {opp ?? '—'}
          </p>
        </div>
      </div>
      {note ? <p className="mt-2 text-sm text-pretty text-ink">{note}</p> : null}

      <h4 className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        Errors by phase
      </h4>
      <ul className="mt-3 space-y-3">
        {phases.map((phase) => {
          const total = analysis.phaseStats[phase].total
          const errors = phaseErrors(analysis, phase)
          const width = total ? Math.max(errors > 0 ? 6 : 0, (errors / total) * 100) : 0
          return (
            <li key={phase}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>{PHASE_LABEL[phase]}</span>
                <span className="font-mono text-xs tabular text-muted">
                  {total === 0 ? "Didn't reach" : `${errors} of ${total} moves`}
                </span>
              </div>
              <div className="mt-1.5 h-2 bg-surface-2" aria-hidden>
                <div
                  className="h-full bg-blunder"
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-5 font-mono text-xs text-muted">
        <span className="tabular">{analysis.totalMoves}</span> moves
        {' · '}
        <span className="tabular">{analysis.flagged.length}</span> flagged
      </p>
    </section>
  )
}

export function ReviewInsights({ analysis }: { analysis: GameAnalysis }) {
  const bandLow = Math.floor(((analysis.userRating ?? 1200) - 100) / 100) * 100
  const bandHigh = bandLow + 199
  const accPct = peerPercentile(analysis.accuracyPct)

  const openingAcc =
    phaseAccuracyFromPlies(analysis.plies, 'opening', true) ??
    phaseAccuracy(analysis.phaseAcpl, 'opening')
  const middleAcc =
    phaseAccuracyFromPlies(analysis.plies, 'middlegame', true) ??
    phaseAccuracy(analysis.phaseAcpl, 'middlegame')
  const openingPct = openingAcc != null ? peerPercentile(openingAcc) : 50
  const middlePct = middleAcc != null ? peerPercentile(middleAcc) : 50
  const blunderPct = Math.max(
    5,
    Math.min(95, 100 - analysis.blunderCount * 18 - analysis.mistakeCount * 8),
  )

  const phaseNote = useMemo(() => insightCopy(analysis), [analysis])

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex gap-3 border border-line bg-surface p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-line bg-surface-2 font-mono text-xs text-muted">
          AI
        </div>
        <p className="text-sm leading-6 text-ink">{phaseNote}</p>
      </div>

      <section>
        <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
          Where you stand this game
        </h3>
        <p className="mt-1 text-sm text-muted">
          VS {bandLow}–{bandHigh}
        </p>
        <div className="mt-4 space-y-4 border border-line bg-surface p-4">
          <StandBar label="Accuracy" percentile={accPct} warn={accPct < 40} />
          <StandBar label="Opening" percentile={openingPct} warn={openingPct < 25} />
          <StandBar label="Middlegame" percentile={middlePct} warn={middlePct < 25} />
          <StandBar label="Blunders" percentile={blunderPct} warn={blunderPct < 30} />
        </div>
      </section>

      <section>
        <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
          Accuracy per move
        </h3>
        <p className="mt-1 text-sm text-muted">Lower on the chart means more centipawn loss.</p>
        <div className="mt-3">
          <AccuracyChart analysis={analysis} />
        </div>
      </section>

      <EngineStats analysis={analysis} />
    </div>
  )
}
