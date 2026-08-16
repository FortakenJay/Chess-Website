import { createFileRoute } from '@tanstack/react-router'
import { Chess } from 'chess.js'
import { useMemo } from 'react'
import { AppShell } from '@/components/AppShell'
import { DrillBoard } from '@/components/DrillBoard'
import { BoardPageSkeleton, PageHeader } from '@/components/ui'
import { usePlayerData } from '@/lib/queries'
import { normalizeUsername } from '@/lib/username'
import type { Tables } from '@/lib/supabase/database.types'

type DrillSearch = {
  position?: string
  fen?: string
  fens?: string
  ids?: string
  motif?: string
  motifKind?: string
  endgameType?: string
  phase?: string
  color?: string
  classification?: string
  timeClass?: string
  order?: 'worst' | 'random' | 'chrono' | 'newest' | 'oldest'
}

export const Route = createFileRoute('/drill/$username')({
  validateSearch: (search: Record<string, unknown>): DrillSearch => ({
    position: typeof search.position === 'string' ? search.position : undefined,
    fen: typeof search.fen === 'string' ? search.fen : undefined,
    fens: typeof search.fens === 'string' ? search.fens : undefined,
    ids: typeof search.ids === 'string' ? search.ids : undefined,
    motif: typeof search.motif === 'string' ? search.motif : undefined,
    motifKind: typeof search.motifKind === 'string' ? search.motifKind : undefined,
    endgameType: typeof search.endgameType === 'string' ? search.endgameType : undefined,
    phase: typeof search.phase === 'string' ? search.phase : undefined,
    color: typeof search.color === 'string' ? search.color : undefined,
    classification: typeof search.classification === 'string' ? search.classification : undefined,
    timeClass: typeof search.timeClass === 'string' ? search.timeClass : undefined,
    order:
      search.order === 'random' ||
      search.order === 'chrono' ||
      search.order === 'worst' ||
      search.order === 'newest' ||
      search.order === 'oldest'
        ? search.order
        : 'worst',
  }),
  component: DrillPage,
})

function adhocFromFen(username: string, fen: string, id = 'adhoc'): Tables<'flagged_positions'> | null {
  try {
    const board = new Chess(fen)
    const color = board.turn() === 'b' ? 'black' : 'white'
    return {
      id,
      username,
      played_on: new Date().toISOString().slice(0, 10),
      opponent: 'analysis',
      color,
      move_number: board.moveNumber(),
      san: '',
      loss: 0,
      classification: 'inaccuracy',
      quality: 'inaccuracy',
      phase: 'middlegame',
      endgame_type: null,
      clock_left: null,
      fen_before: board.fen(),
      game_link: '',
      motif: null,
      motif_kind: null,
      time_class: null,
    }
  } catch {
    return null
  }
}

function selectPositions(
  all: Tables<'flagged_positions'>[],
  search: DrillSearch,
  username: string,
) {
  if (search.fens) {
    return search.fens
      .split(';')
      .map((fen, index) => adhocFromFen(username, fen.trim(), `adhoc-${index}`))
      .filter((row): row is Tables<'flagged_positions'> => row != null)
  }
  if (search.fen) {
    const adhoc = adhocFromFen(username, search.fen)
    return adhoc ? [adhoc] : []
  }
  let rows = all
  if (search.ids) {
    const set = new Set(search.ids.split(',').filter(Boolean))
    rows = rows.filter((r) => set.has(r.id))
  }
  if (search.motif) rows = rows.filter((r) => r.motif === search.motif)
  if (search.motifKind) rows = rows.filter((r) => r.motif_kind === search.motifKind)
  if (search.endgameType) rows = rows.filter((r) => r.endgame_type === search.endgameType)
  if (search.phase) rows = rows.filter((r) => r.phase === search.phase)
  if (search.color) rows = rows.filter((r) => r.color === search.color)
  if (search.classification) rows = rows.filter((r) => r.classification === search.classification)
  if (search.timeClass) rows = rows.filter((r) => (r.time_class || '') === search.timeClass)

  if (search.order === 'newest') {
    rows = [...rows].sort((a, b) => b.played_on.localeCompare(a.played_on) || b.move_number - a.move_number)
  } else if (search.order === 'oldest' || search.order === 'chrono') {
    rows = [...rows].sort((a, b) => a.played_on.localeCompare(b.played_on) || a.move_number - b.move_number)
  } else if (search.order === 'random') {
    rows = [...rows].sort(() => Math.random() - 0.5)
  } else {
    rows = [...rows].sort((a, b) => b.loss - a.loss)
  }

  if (search.position) {
    const start = rows.findIndex((row) => row.id === search.position)
    if (start === -1) return []
    rows = [...rows.slice(start), ...rows.slice(0, start)]
  }
  return rows
}

function DrillPage() {
  const { username } = Route.useParams()
  const search = Route.useSearch()
  const name = normalizeUsername(username)
  const query = usePlayerData(name)
  const positions = useMemo(
    () => selectPositions(query.data?.positions ?? [], search, name),
    [query.data?.positions, search, name],
  )

  return (
    <AppShell username={name} dense={positions.length > 0}>
      {query.isLoading && !search.fen && !search.fens ? (
        <BoardPageSkeleton label="Loading drill positions" className="mt-0" />
      ) : positions.length > 0 ? (
        <DrillBoard username={name} positions={positions} />
      ) : (
        <>
          <PageHeader
            title="Drill"
            username={name}
            description="Position on the board. Move first. Then the historical move and the engine line."
          />
          <p className="mt-8 text-sm text-muted">No positions in this set.</p>
        </>
      )}
    </AppShell>
  )
}
