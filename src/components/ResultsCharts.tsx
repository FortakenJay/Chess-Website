import {
  AccuracyTrendChart,
  ClockChart,
  ColorChart,
  DrillByMotifChart,
  DrillTrendChart,
  EndgameTypeChart,
  MotifChart,
  MotifKindChart,
  MoveHistogram,
  OpeningRepertoireChart,
  PhaseAcplChart,
  PhaseChart,
  QualityFunnelChart,
  RatingBandChart,
  RecoveryChart,
  TimeClassChart,
  TrendChart,
  WinRateChart,
} from '@/components/charts'
import { EmptyState, Panel, Section } from '@/components/ui'
import type { ResultsModel } from '@/lib/resultsModel'
import { MOTIF_LABEL, PHASE_LABEL, TIMEFRAME_LABEL, type Timeframe } from '@/lib/stats'

export function ResultsCharts({
  model,
  timeframe,
}: {
  model: ResultsModel
  timeframe: Timeframe
}) {
  if (model.filteredGames.length === 0) {
    return (
      <EmptyState>No analyzed games for {TIMEFRAME_LABEL[timeframe].toLowerCase()}.</EmptyState>
    )
  }

  return (
    <>
      <Panel className="mt-6" padding="md">
        {model.headline ? (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Primary leak · {TIMEFRAME_LABEL[timeframe]}
            </p>
            <p className="mt-3 max-w-3xl text-pretty text-2xl leading-snug tracking-tight md:text-3xl">
              {PHASE_LABEL[model.headline.phase]} ·{' '}
              <span className="font-mono tabular text-ink">{model.headline.errorPct}%</span> of
              moves are blunders or mistakes
            </p>
            {model.headline.topMotif ? (
              <p className="mt-3 max-w-2xl text-pretty text-sm text-muted">
                Among tagged blunders,{' '}
                {MOTIF_LABEL[model.headline.topMotif] ??
                  model.headline.topMotif.replaceAll('_', ' ')}{' '}
                is{' '}
                <span className="font-mono tabular text-ink">{model.headline.motifShare}%</span>
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-pretty text-sm text-muted">Not enough moves yet for a phase leak.</p>
        )}
        <p className="mt-5 font-mono text-xs text-muted">
          <span className="tabular">{model.filteredGames.length}</span> games ·{' '}
          <span className="tabular">{model.filteredPositions.length}</span> flagged positions
        </p>
      </Panel>

      <Section title="Where you leak">
        <PhaseChart stats={model.byPhase} />
        <MotifChart positions={model.filteredPositions} />
        <MotifKindChart split={model.motifKind} />
        <QualityFunnelChart stats={model.quality} />
      </Section>

      <Section title="Precision">
        <AccuracyTrendChart points={model.accuracyPoints} />
        <PhaseAcplChart rows={model.phaseAcpl} />
        <TrendChart points={model.trendPoints} />
        <MoveHistogram positions={model.filteredPositions} />
      </Section>

      <Section title="Endgame & recovery">
        <EndgameTypeChart stats={model.endgame} conversion={model.endgameConversion} />
        <RecoveryChart recovery={model.recovery} />
        <WinRateChart buckets={model.winRate} />
      </Section>

      <Section title="Context">
        <OpeningRepertoireChart rows={model.openings} />
        <TimeClassChart rows={model.timeClass} />
        <RatingBandChart rows={model.ratingBands} />
        <ColorChart stats={model.byColor} />
        <ClockChart stats={model.byClock} />
      </Section>

      <Section title="Drill">
        <DrillTrendChart weeks={model.drillWeeks} />
        <DrillByMotifChart rows={model.drillByMotif} />
      </Section>
    </>
  )
}
