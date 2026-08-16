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
      <Panel className="relative mt-6 overflow-hidden border-l-4 border-l-blunder" padding="md">
        <span className="pointer-events-none absolute -right-5 -top-16 font-display text-[12rem] leading-none text-ink/[0.025]" aria-hidden>
          ×
        </span>
        {model.headline ? (
          <>
            <p className="relative font-mono text-[11px] uppercase tracking-[0.1em] text-blunder-text">
              Primary leak · {TIMEFRAME_LABEL[timeframe]}
            </p>
            <p className="relative mt-3 max-w-3xl text-pretty font-display text-4xl uppercase leading-[0.95] tracking-[-0.02em] md:text-6xl">
              {PHASE_LABEL[model.headline.phase]} is where the position breaks.
            </p>
            <p className="relative mt-4 font-mono text-sm text-muted">
              <span className="tabular text-bone">{model.headline.errorPct}%</span> of moves are
              blunders or mistakes
            </p>
            {model.headline.topMotif ? (
              <p className="relative mt-3 max-w-2xl text-pretty text-sm text-muted">
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
          <span className="tabular">{model.filteredGames.length}</span> games
          {model.rangeStart ? (
            <>
              {' '}
              since <span className="tabular">{model.rangeStart}</span>
            </>
          ) : null}{' '}
          · <span className="tabular">{model.filteredPositions.length}</span> flagged positions
        </p>
        {model.latestGames.length > 0 ? (
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {model.latestGames.slice(0, 8).map((game) => (
              <li
                key={game.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-1.5 font-mono text-xs"
              >
                <span className="text-muted tabular">{game.played_on}</span>
                <span className="min-w-0 flex-1 truncate text-ink" translate="no">
                  vs {game.opponent}
                </span>
                <span className="text-muted">{game.result}</span>
              </li>
            ))}
          </ul>
        ) : null}
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
        <OpeningRepertoireChart games={model.filteredGames} />
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
