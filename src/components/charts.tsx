import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Panel } from '@/components/ui'
import type {
  ClockStats,
  ColorStats,
  EndgameType,
  EndgameTypeStats,
  Motif,
  MoveQuality,
  PhaseStats,
  QualityStats,
} from '@/lib/analysis/types'
import {
  ENDGAME_LABEL,
  errorRate,
  MOTIF_LABEL,
  PHASE_LABEL,
  QUALITY_LABEL,
} from '@/lib/stats'
import type { Tables } from '@/lib/supabase/database.types'

const axis = { fill: '#8b8f9a', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }
const grid = { stroke: '#2a2d36' }
const tooltipCursor = { fill: 'rgba(236, 236, 236, 0.06)' }
const QUALITY_ORDER: MoveQuality[] = [
  'brilliant',
  'great',
  'book',
  'best',
  'excellent',
  'good',
  'miss',
  'inaccuracy',
  'mistake',
  'blunder',
]

function Frame({
  title,
  hint,
  children,
  variant = 'chart',
}: {
  title: string
  hint?: string
  children: ReactNode
  variant?: 'chart' | 'panel'
}) {
  return (
    <Panel>
      <div className="mb-4">
        <h3 className="text-pretty text-xs uppercase tracking-[0.14em] text-muted">{title}</h3>
        {hint ? <p className="mt-1 font-mono text-[11px] text-muted/80">{hint}</p> : null}
      </div>
      {variant === 'chart' ? <div className="h-52 sm:h-56">{children}</div> : children}
    </Panel>
  )
}

function TooltipShell({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="border border-line bg-surface px-2.5 py-1.5 font-mono text-xs text-ink">
      {label != null && label !== '' ? <div className="text-muted">{label}</div> : null}
      {children}
    </div>
  )
}

function RateTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <TooltipShell label={label}>
      {payload.map((p) => (
        <div key={p.name} className={p.name === 'blunder' ? 'text-blunder' : 'text-ink'}>
          {p.name}: {p.value}%
        </div>
      ))}
    </TooltipShell>
  )
}

function CountTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <TooltipShell label={label}>
      <div className="text-ink">{payload[0]?.value ?? 0} positions</div>
    </TooltipShell>
  )
}

function ValueTooltip({
  active,
  payload,
  label,
  suffix = '',
}: {
  active?: boolean
  payload?: Array<{ value?: number | string; name?: string }>
  label?: string
  suffix?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <TooltipShell label={label}>
      {payload.map((p) => (
        <div key={String(p.name)} className="text-ink">
          {p.name}: {p.value}
          {suffix}
        </div>
      ))}
    </TooltipShell>
  )
}

function QualityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: number; payload?: { share?: number } }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0]
  return (
    <TooltipShell label={label}>
      <div className="text-ink">{point?.value ?? 0} moves</div>
      <div className="text-muted">{point?.payload?.share ?? 0}%</div>
    </TooltipShell>
  )
}

function MoveDistributionTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{
    value: number
    payload?: { share?: number }
  }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0]
  return (
    <TooltipShell label={`Moves ${label ?? ''}`}>
      <div className="text-blunder">{point?.value ?? 0} blunders</div>
      <div className="text-ink">{point?.payload?.share ?? 0}% of all blunders</div>
    </TooltipShell>
  )
}

export function PhaseChart({ stats }: { stats: PhaseStats }) {
  const data = (['opening', 'middlegame', 'endgame'] as const).map((phase) => ({
    name: PHASE_LABEL[phase],
    error: errorRate(stats[phase]),
    blunder: stats[phase].total ? Math.round((stats[phase].blunder / stats[phase].total) * 1000) / 10 : 0,
  }))
  return (
    <Frame title="Error rate by phase">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} unit="%" />
          <Tooltip content={<RateTooltip />} cursor={tooltipCursor} />
          <Bar dataKey="error" name="blunder+mistake" fill="#ececec" maxBarSize={48} />
          <Bar dataKey="blunder" name="blunder" fill="#e5484d" maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function MotifChart({ positions }: { positions: Tables<'flagged_positions'>[] }) {
  const counts = new Map<string, number>()
  for (const row of positions) {
    if (!row.motif) continue
    counts.set(row.motif, (counts.get(row.motif) ?? 0) + 1)
  }
  const data = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([motif, count]) => ({
      name: MOTIF_LABEL[motif as Motif] ?? motif,
      count,
    }))
  if (data.length === 0) {
    return (
      <Frame title="Tactical motif" variant="panel">
        <p className="text-sm text-muted text-pretty">No named motifs on flagged moves yet.</p>
      </Frame>
    )
  }
  return (
    <Frame title="Tactical motif">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid {...grid} horizontal={false} />
          <XAxis type="number" tick={axis} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={axis} axisLine={false} tickLine={false} width={140} />
          <Tooltip content={<CountTooltip />} cursor={tooltipCursor} />
          <Bar dataKey="count" fill="#ececec" maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function ColorChart({ stats }: { stats: ColorStats }) {
  const data = [
    {
      name: 'White',
      error: errorRate(stats.white),
      blunder: stats.white.total
        ? Math.round((stats.white.blunder / stats.white.total) * 1000) / 10
        : 0,
    },
    {
      name: 'Black',
      error: errorRate(stats.black),
      blunder: stats.black.total
        ? Math.round((stats.black.blunder / stats.black.total) * 1000) / 10
        : 0,
    },
  ]
  return (
    <Frame title="Error rate by color">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} unit="%" />
          <Tooltip content={<RateTooltip />} cursor={tooltipCursor} />
          <Bar dataKey="error" name="blunder+mistake" fill="#ececec" maxBarSize={64} />
          <Bar dataKey="blunder" name="blunder" fill="#e5484d" maxBarSize={64} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function ClockChart({ stats }: { stats: ClockStats }) {
  const data = [
    {
      name: '<30s',
      error: errorRate(stats.lt30),
      blunder: stats.lt30.total
        ? Math.round((stats.lt30.blunder / stats.lt30.total) * 1000) / 10
        : 0,
    },
    {
      name: '30–60s',
      error: errorRate(stats['30_60']),
      blunder: stats['30_60'].total
        ? Math.round((stats['30_60'].blunder / stats['30_60'].total) * 1000) / 10
        : 0,
    },
    {
      name: '60s+',
      error: errorRate(stats.gt60),
      blunder: stats.gt60.total
        ? Math.round((stats.gt60.blunder / stats.gt60.total) * 1000) / 10
        : 0,
    },
  ]
  return (
    <Frame title="Error rate vs clock">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} unit="%" />
          <Tooltip content={<RateTooltip />} cursor={tooltipCursor} />
          <Bar dataKey="error" name="blunder+mistake" fill="#ececec" maxBarSize={48} />
          <Bar dataKey="blunder" name="blunder" fill="#e5484d" maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function TrendChart({
  points,
}: {
  points: Array<{ date: string; errorPct: number; blunderPct: number }>
}) {
  const data = points.map((point) => ({
    name: point.date.length === 10 ? point.date.slice(5) : point.date,
    error: point.errorPct,
    blunder: point.blunderPct,
  }))
  if (data.length < 2) {
    return (
      <Frame title="Trend" variant="panel">
        <p className="text-sm text-muted text-pretty">
          Need games on at least two dates to plot a trend.
        </p>
      </Frame>
    )
  }
  return (
    <Frame title="Trend (blunder + mistake %)">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} unit="%" />
          <Tooltip content={<RateTooltip />} cursor={tooltipCursor} />
          <Line type="linear" dataKey="error" name="error" stroke="#ececec" strokeWidth={1.5} dot={false} />
          <Line
            type="linear"
            dataKey="blunder"
            name="blunder"
            stroke="#e5484d"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function MoveHistogram({ positions }: { positions: Tables<'flagged_positions'>[] }) {
  const counts = new Map<number, number>()
  for (const row of positions) {
    if (row.classification !== 'blunder') continue
    const bucket = Math.floor(row.move_number / 5) * 5
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0)
  const data = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, count]) => ({
      name: `${start}–${start + 4}`,
      count,
      share: total ? Math.round((count / total) * 1000) / 10 : 0,
    }))
  return (
    <Frame title="Blunder move-number distribution">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<MoveDistributionTooltip />} cursor={tooltipCursor} />
          <Bar dataKey="count" fill="#e5484d" maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function WinRateChart({
  buckets,
}: {
  buckets: Record<'zero' | 'one' | 'twoPlus', { games: number; wins: number }>
}) {
  const data = [
    { name: '0 blunders', rate: buckets.zero.games ? Math.round((buckets.zero.wins / buckets.zero.games) * 1000) / 10 : 0 },
    { name: '1 blunder', rate: buckets.one.games ? Math.round((buckets.one.wins / buckets.one.games) * 1000) / 10 : 0 },
    { name: '2+ blunders', rate: buckets.twoPlus.games ? Math.round((buckets.twoPlus.wins / buckets.twoPlus.games) * 1000) / 10 : 0 },
  ]
  return (
    <Frame title="Win rate by blunders in the game">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} unit="%" />
          <Tooltip content={<ValueTooltip suffix="%" />} cursor={tooltipCursor} />
          <Bar dataKey="rate" name="win rate" fill="#ececec" maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function DrillTrendChart({
  weeks,
}: {
  weeks: Array<{ week: string; solvedPct: number; total: number }>
}) {
  if (weeks.length === 0) {
    return (
      <Frame title="Drill solve rate" variant="panel">
        <p className="text-sm text-muted text-pretty">No drill attempts stored yet.</p>
      </Frame>
    )
  }
  const data = weeks.map((w) => ({ name: w.week.slice(5), error: w.solvedPct }))
  return (
    <Frame title="Drill solve rate (week over week)">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} unit="%" />
          <Tooltip content={<RateTooltip />} cursor={tooltipCursor} />
          <Line type="linear" dataKey="error" name="solved" stroke="#ececec" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function AccuracyTrendChart({
  points,
}: {
  points: Array<{ date: string; acpl: number; accuracy: number }>
}) {
  const data = points.map((point) => ({
    name: point.date.length === 10 ? point.date.slice(5) : point.date,
    accuracy: point.accuracy,
    acpl: point.acpl,
  }))
  if (data.length < 2) {
    return (
      <Frame title="Accuracy / ACPL" variant="panel">
        <p className="text-sm text-muted text-pretty">
          Need games on at least two dates. Re-sync to backfill ACPL.
        </p>
      </Frame>
    )
  }
  return (
    <Frame title="Accuracy % and ACPL">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis yAxisId="acc" tick={axis} axisLine={false} tickLine={false} unit="%" />
          <YAxis yAxisId="acpl" orientation="right" tick={axis} axisLine={false} tickLine={false} />
          <Tooltip content={<ValueTooltip />} cursor={tooltipCursor} />
          <Line
            yAxisId="acc"
            type="linear"
            dataKey="accuracy"
            name="accuracy"
            stroke="#ececec"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            yAxisId="acpl"
            type="linear"
            dataKey="acpl"
            name="acpl"
            stroke="#e5484d"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function QualityFunnelChart({ stats }: { stats: QualityStats }) {
  const total = Object.values(stats).reduce((sum, n) => sum + n, 0)
  const data = QUALITY_ORDER.map((key) => ({
    name: QUALITY_LABEL[key],
    count: stats[key],
    share: total ? Math.round((stats[key] / total) * 1000) / 10 : 0,
  }))
  if (total === 0) {
    return (
      <Frame title="Move quality funnel" variant="panel">
        <p className="text-sm text-muted text-pretty">
          Re-sync games to compute the full quality funnel.
        </p>
      </Frame>
    )
  }
  return (
    <Frame title="Move quality funnel">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<QualityTooltip />} cursor={tooltipCursor} />
          <Bar dataKey="count" fill="#ececec" maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function EndgameTypeChart({
  stats,
  conversion,
}: {
  stats: EndgameTypeStats
  conversion: { opportunities: number; conversions: number; rate: number }
}) {
  const data = (Object.keys(stats) as EndgameType[]).map((key) => ({
    name: ENDGAME_LABEL[key],
    error: errorRate(stats[key]),
    blunder: stats[key].total
      ? Math.round((stats[key].blunder / stats[key].total) * 1000) / 10
      : 0,
  }))
  return (
    <Frame
      title="Endgame subtypes"
      hint={
        conversion.opportunities > 0
          ? `Convert ${conversion.rate}% when up decisive material (${conversion.conversions}/${conversion.opportunities})`
          : 'Conversion rate appears after re-sync'
      }
    >
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} unit="%" />
          <Tooltip content={<RateTooltip />} cursor={tooltipCursor} />
          <Bar dataKey="error" name="blunder+mistake" fill="#ececec" maxBarSize={40} />
          <Bar dataKey="blunder" name="blunder" fill="#e5484d" maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function RecoveryChart({
  recovery,
}: {
  recovery: { moves: number; errors: number; errorPct: number }
}) {
  return (
    <Frame title="Recovery after blunder" variant="panel">
      {recovery.moves === 0 ? (
        <p className="text-sm text-muted text-pretty">
          Re-sync to measure the next 3–5 moves after each of your blunders.
        </p>
      ) : (
        <div className="flex min-h-40 flex-col justify-end gap-3">
          <p className="font-mono text-4xl tabular tracking-tight">{recovery.errorPct}%</p>
          <p className="max-w-sm text-sm text-muted text-pretty">
            Error rate on the moves right after a blunder ({recovery.errors} of {recovery.moves}).
          </p>
        </div>
      )}
    </Frame>
  )
}

export function OpeningRepertoireChart({
  rows,
}: {
  rows: Array<{ eco: string; name: string; games: number; winPct: number; errorPct: number }>
}) {
  if (rows.length === 0) {
    return (
      <Frame title="Opening repertoire" variant="panel">
        <p className="text-sm text-muted text-pretty">No ECO tags yet. Re-sync to pull opening headers.</p>
      </Frame>
    )
  }
  const data = rows.slice(0, 8).map((row) => ({
    name: row.eco === '—' ? row.name.slice(0, 14) : row.eco,
    error: row.errorPct,
    win: row.winPct,
  }))
  return (
    <Frame title="Opening repertoire (ECO)">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} unit="%" />
          <Tooltip content={<ValueTooltip suffix="%" />} cursor={tooltipCursor} />
          <Bar dataKey="error" name="opening errors" fill="#e5484d" maxBarSize={28} />
          <Bar dataKey="win" name="win %" fill="#ececec" maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function TimeClassChart({
  rows,
}: {
  rows: Array<{ name: string; games: number; errorPct: number }>
}) {
  if (rows.length === 0) {
    return (
      <Frame title="Time control" variant="panel">
        <p className="text-sm text-muted text-pretty">No time-class data yet.</p>
      </Frame>
    )
  }
  const data = rows.map((row) => ({ name: row.name, error: row.errorPct }))
  return (
    <Frame title="Error rate by time control">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} unit="%" />
          <Tooltip content={<RateTooltip />} cursor={tooltipCursor} />
          <Bar dataKey="error" name="blunder+mistake" fill="#ececec" maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function RatingBandChart({
  rows,
}: {
  rows: Array<{ name: string; games: number; errorPct: number }>
}) {
  const data: Array<{ name: string; error: number }> = []
  for (const row of rows) {
    if (row.games <= 0) continue
    data.push({ name: row.name, error: row.errorPct })
  }
  if (data.length === 0) {
    return (
      <Frame title="Opponent rating band" variant="panel">
        <p className="text-sm text-muted text-pretty">Re-sync to store ratings for band splits.</p>
      </Frame>
    )
  }
  return (
    <Frame title="Error rate vs opponent rating">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} unit="%" />
          <Tooltip content={<RateTooltip />} cursor={tooltipCursor} />
          <Bar dataKey="error" name="blunder+mistake" fill="#ececec" maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function MotifKindChart({
  split,
}: {
  split: { omission: number; commission: number }
}) {
  const data = [
    { name: 'Missed wins', count: split.omission },
    { name: 'Got hit', count: split.commission },
  ]
  if (split.omission + split.commission === 0) {
    return (
      <Frame title="Omission vs commission" variant="panel">
        <p className="text-sm text-muted text-pretty">No tagged motifs yet.</p>
      </Frame>
    )
  }
  return (
    <Frame title="Omission vs commission">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CountTooltip />} cursor={tooltipCursor} />
          <Bar dataKey="count" fill="#ececec" maxBarSize={64} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function DrillByMotifChart({
  rows,
}: {
  rows: Array<{ label: string; solvedPct: number; total: number }>
}) {
  if (rows.length === 0) {
    return (
      <Frame title="Drill accuracy by motif" variant="panel">
        <p className="text-sm text-muted text-pretty">No motif-tagged drill attempts yet.</p>
      </Frame>
    )
  }
  const data = rows.slice(0, 8).map((row) => ({
    name: row.label,
    error: row.solvedPct,
  }))
  return (
    <Frame title="Drill accuracy by motif">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid {...grid} horizontal={false} />
          <XAxis type="number" tick={axis} axisLine={false} tickLine={false} unit="%" />
          <YAxis type="category" dataKey="name" tick={axis} axisLine={false} tickLine={false} width={110} />
          <Tooltip content={<RateTooltip />} cursor={tooltipCursor} />
          <Bar dataKey="error" name="solved" fill="#ececec" maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function PhaseAcplChart({
  rows,
}: {
  rows: Array<{ phase: keyof typeof PHASE_LABEL; acpl: number }>
}) {
  const data = rows.map((row) => ({ name: PHASE_LABEL[row.phase], acpl: row.acpl }))
  if (data.every((row) => row.acpl === 0)) {
    return (
      <Frame title="ACPL by phase" variant="panel">
        <p className="text-sm text-muted text-pretty">Re-sync to backfill phase ACPL.</p>
      </Frame>
    )
  }
  return (
    <Frame title="ACPL by phase">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} />
          <Tooltip content={<ValueTooltip />} cursor={tooltipCursor} />
          <Bar dataKey="acpl" name="acpl" fill="#ececec" maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}
