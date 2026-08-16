import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  GameTypeControl,
  InsightCount,
  InsightTable,
  peerLabel,
  StatRow,
} from '@/components/InsightStats'
import { SegmentedControl } from '@/components/ui'
import type { StrategyMetric } from '@/lib/analysis/types'
import { formatPct, gradeForAccuracy } from '@/lib/grades'
import { getBrowserClient } from '@/lib/supabase/browser'
import {
  accuracyFromBucket,
  filterGamesByTimeClass,
  strategyFromGames,
  timeClassFilterOptions,
  type StructureFilter,
  type TimeClassFilter,
} from '@/lib/strategyStats'
import type { Tables } from '@/lib/supabase/database.types'

const METRICS: Array<{ key: StrategyMetric; label: string }> = [
  { key: 'activePiece', label: 'Active piece accuracy' },
  { key: 'attacking', label: 'Attacking accuracy' },
  { key: 'defending', label: 'Defending accuracy' },
  { key: 'overall', label: 'Overall strategic accuracy' },
  { key: 'pawnStructure', label: 'Pawn structure accuracy' },
  { key: 'space', label: 'Space advantage accuracy' },
]

type PeerPayload = {
  players?: number
  metrics?: Record<string, { moves?: number; pct?: number | null }>
}

export function StrategyInsights({
  username,
  games,
}: {
  username: string
  games: Tables<'games'>[]
}) {
  const [timeClass, setTimeClass] = useState<TimeClassFilter>('all')
  const [structure, setStructure] = useState<StructureFilter>('all')
  const timeClassOptions = useMemo(() => timeClassFilterOptions(games), [games])
  const filtered = useMemo(
    () => filterGamesByTimeClass(games, timeClass),
    [games, timeClass],
  )
  const stats = useMemo(() => strategyFromGames(filtered), [filtered])
  const group = stats[structure]
  const peers = useQuery({
    queryKey: ['strategy-peers', username, timeClass, structure],
    queryFn: async () => {
      const { data, error } = await getBrowserClient().rpc('strategy_peer_stats', {
        viewed_username: username,
        p_time_class: timeClass === 'all' ? null : timeClass,
        p_structure: structure,
      })
      if (error) throw error
      return data as PeerPayload
    },
    staleTime: 60_000,
  })

  return (
    <div className="mt-6 space-y-5">
      <InsightCount label="Strategy" value={group.overall.moves} />
      <GameTypeControl
        value={timeClass}
        options={timeClassOptions}
        onChange={setTimeClass}
      />
      <SegmentedControl
        label="Position type"
        value={structure}
        onChange={setStructure}
        className="mt-2 sm:mt-2"
        options={[
          { value: 'all', label: 'All' },
          { value: 'open', label: 'Open' },
          { value: 'closed', label: 'Closed' },
          { value: 'semi_closed', label: 'Semi-closed' },
        ]}
      />
      <InsightTable heading="Strategy stats" headingId="strategy-stats-heading">
        {METRICS.map((metric) => {
          const accuracy = accuracyFromBucket(group[metric.key])
          return (
            <StatRow
              key={metric.key}
              label={metric.label}
              grade={gradeForAccuracy(accuracy)}
              value={formatPct(accuracy)}
              peers={peerLabel(peers.data?.metrics?.[metric.key]?.pct)}
            />
          )
        })}
      </InsightTable>
      <p className="text-xs text-muted">
        Similar-rated players (±100 Elo, same time control) score about this accuracy. This is not
        Chess.com’s own peer view. A row stays blank until at least five players and 100 moves exist.
      </p>
    </div>
  )
}
