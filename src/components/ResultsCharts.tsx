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
import { STRUCTURE_LABEL, thriveCopy } from '@/lib/playstyle'
import { formatPct } from '@/lib/grades'
import { chartTheme } from '@/lib/chartTheme'

function PlaystylePanel({ playstyle }: { playstyle: NonNullable<ResultsModel['playstyle']> }) {
  const headline = thriveCopy(playstyle)
  const maxAccuracy = Math.max(...playstyle.structures.map((row) => row.accuracy ?? 0), 1)

  return (
    <Panel className="relative mt-4 overflow-hidden border-l-4 border-l-accent" padding="md">
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent">Playstyle</p>
      {headline ? (
        <p className="mt-3 max-w-3xl text-pretty font-display text-3xl uppercase leading-[0.95] tracking-[-0.02em] md:text-4xl">
          {headline}
        </p>
      ) : (
        <p className="mt-3 max-w-2xl text-pretty text-sm text-muted">
          Not enough open, closed, and semi-closed samples yet to name a terrain.
        </p>
      )}
      <ul className="mt-5 flex flex-col gap-2.5">
        {playstyle.structures.map((row) => {
          const width =
            row.accuracy == null ? '0%' : `${Math.max(4, (row.accuracy / maxAccuracy) * 100)}%`
          const vs =
            row.vsOverallPct == null
              ? row.moves < 40
                ? 'too few moves'
                : null
              : row.vsOverallPct > 0
                ? `+${row.vsOverallPct}% vs avg`
                : row.vsOverallPct < 0
                  ? `${row.vsOverallPct}% vs avg`
                  : 'even vs avg'
          return (
            <li
              key={row.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] sm:gap-3"
            >
              <span className="truncate font-mono text-[11px] uppercase tracking-[0.08em] text-ink">
                {STRUCTURE_LABEL[row.id]}
              </span>
              <span className="min-w-8 text-right font-mono text-[11px] tabular text-muted sm:order-3">
                {formatPct(row.accuracy)}
              </span>
              <div className="col-span-2 h-2 bg-surface-2 sm:col-span-1 sm:order-2" aria-hidden>
                <div
                  className="h-full"
                  style={{
                    width,
                    backgroundColor:
                      playstyle.thrive?.best === row.id ? chartTheme.primary : 'var(--ink)',
                  }}
                />
              </div>
              {vs ? (
                <p className="col-span-2 font-mono text-[11px] text-muted sm:col-span-3">{vs}</p>
              ) : null}
            </li>
          )
        })}
      </ul>
      {playstyle.traits.length ? (
        <ul className="mt-5 divide-y divide-line border-t border-line">
          {playstyle.traits.map((trait) => (
            <li key={trait.id} className="py-3">
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <p className="min-w-0 font-medium text-ink">{trait.label}</p>
                <p className="shrink-0 font-mono text-[11px] tabular text-accent">{trait.value}</p>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted">{trait.detail}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  )
}

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

      {model.playstyle ? <PlaystylePanel playstyle={model.playstyle} /> : null}

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
