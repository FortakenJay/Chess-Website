import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  GameTypeControl,
  InsightCount,
  InsightTable,
  peerLabel,
  StatRow,
} from '@/components/InsightStats'
import type { EndgameEntry, EndgameTheme } from '@/lib/analysis/types'
import { formatPct, gradeForAccuracy, gradeForConversion } from '@/lib/grades'
import { getBrowserClient } from '@/lib/supabase/browser'
import {
  accuracyFromBucket,
  endgameAccuracyFromGames,
  endgameConversionFromGames,
  filterGamesByTimeClass,
  timeClassFilterOptions,
  winPct,
  type TimeClassFilter,
} from '@/lib/strategyStats'
import type { Tables } from '@/lib/supabase/database.types'

const WIN_ROWS: Array<{ key: EndgameEntry; label: string }> = [
  { key: 'better', label: 'From better position' },
  { key: 'equal', label: 'From equal position' },
  { key: 'worse', label: 'From worse position' },
]

const ACCURACY_ROWS: Array<{ key: EndgameTheme; label: string }> = [
  { key: 'pawn', label: 'King and pawn endgames' },
  { key: 'other', label: 'Other endgames' },
  { key: 'overall', label: 'Overall endgame accuracy' },
  { key: 'queen', label: 'Queen endgames' },
  { key: 'rook', label: 'Rook and pawn endgames' },
]

type PeerPayload = {
  players?: number
  win?: Record<string, { games?: number; pct?: number | null }>
  accuracy?: Record<string, { moves?: number; pct?: number | null }>
}

export function EndgameInsights({
  username,
  games,
}: {
  username: string
  games: Tables<'games'>[]
}) {
  const [timeClass, setTimeClass] = useState<TimeClassFilter>('all')
  const timeClassOptions = useMemo(() => timeClassFilterOptions(games), [games])
  const filtered = useMemo(
    () => filterGamesByTimeClass(games, timeClass),
    [games, timeClass],
  )
  const conversion = useMemo(() => endgameConversionFromGames(filtered), [filtered])
  const accuracy = useMemo(() => endgameAccuracyFromGames(filtered), [filtered])
  const peers = useQuery({
    queryKey: ['endgame-peers', username, timeClass],
    queryFn: async () => {
      const { data, error } = await getBrowserClient().rpc('endgame_peer_stats', {
        viewed_username: username,
        p_time_class: timeClass === 'all' ? null : timeClass,
      })
      if (error) throw error
      return data as PeerPayload
    },
    staleTime: 60_000,
  })

  return (
    <div className="mt-6 space-y-5">
      <InsightCount label="Endgames" value={accuracy.overall.moves} />
      <GameTypeControl
        value={timeClass}
        options={timeClassOptions}
        onChange={setTimeClass}
      />
      <InsightTable heading="Endgame win percentage" headingId="endgame-win-heading">
        {WIN_ROWS.map((row) => {
          const pct = winPct(conversion[row.key])
          return (
            <StatRow
              key={row.key}
              label={row.label}
              grade={gradeForConversion(pct, row.key)}
              value={formatPct(pct)}
              peers={peerLabel(peers.data?.win?.[row.key]?.pct)}
            />
          )
        })}
      </InsightTable>
      <InsightTable heading="Endgame accuracy by theme" headingId="endgame-accuracy-heading">
        {ACCURACY_ROWS.map((row) => {
          const value = accuracyFromBucket(accuracy[row.key])
          return (
            <StatRow
              key={row.key}
              label={row.label}
              grade={gradeForAccuracy(value)}
              value={formatPct(value)}
              peers={peerLabel(peers.data?.accuracy?.[row.key]?.pct)}
            />
          )
        })}
      </InsightTable>
      <p className="text-xs text-muted">
        Similar-rated players (±100 Elo, same time control) score about this rate. This is not
        Chess.com’s own peer view. A row stays blank until at least five players and 100 games or
        moves exist.
      </p>
    </div>
  )
}
