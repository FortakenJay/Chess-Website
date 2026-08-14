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
import type { ClockStats, ColorStats, Motif, PhaseStats } from '@/lib/analysis/types'
import { errorRate, MOTIF_LABEL, PHASE_LABEL } from '@/lib/stats'
import type { Tables } from '@/lib/supabase/database.types'

const axis = { fill: '#8b8f9a', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }
const grid = { stroke: '#2a2d36' }

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-line bg-surface p-4">
      <h3 className="mb-4 text-xs uppercase tracking-wider text-muted">{title}</h3>
      <div className="h-56">{children}</div>
    </section>
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
    <div className="border border-line bg-canvas px-2 py-1 font-mono text-xs">
      <div className="text-muted">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className={p.name === 'blunder' ? 'text-blunder' : 'text-ink'}>
          {p.name}: {p.value}%
        </div>
      ))}
    </div>
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
    <div className="border border-line bg-canvas px-2 py-1 font-mono text-xs">
      <div className="text-muted">{label}</div>
      <div className="text-ink">{payload[0]?.value ?? 0} positions</div>
    </div>
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
    <div className="border border-line bg-canvas px-2 py-1 font-mono text-xs">
      <div className="text-muted">Moves {label}</div>
      <div className="text-blunder">{point?.value ?? 0} blunders</div>
      <div className="text-ink">{point?.payload?.share ?? 0}% of all blunders</div>
    </div>
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
          <Tooltip content={<RateTooltip />} />
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
      <Frame title="Tactical motif">
        <p className="text-sm text-muted">No named motifs on flagged moves yet.</p>
      </Frame>
    )
  }
  return (
    <Frame title="Tactical motif">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid {...grid} horizontal={false} />
          <XAxis type="number" tick={axis} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={axis} axisLine={false} tickLine={false} width={110} />
          <Tooltip content={<CountTooltip />} />
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
          <Tooltip content={<RateTooltip />} />
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
          <Tooltip content={<RateTooltip />} />
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
      <Frame title="Trend">
        <p className="text-sm text-muted">Need games on at least two dates to plot a trend.</p>
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
          <Tooltip content={<RateTooltip />} />
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
          <Tooltip content={<MoveDistributionTooltip />} />
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
          <Tooltip />
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
      <Frame title="Drill solve rate">
        <p className="text-sm text-muted">No drill attempts stored yet.</p>
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
          <Tooltip content={<RateTooltip />} />
          <Line type="linear" dataKey="error" name="solved" stroke="#ececec" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  )
}
