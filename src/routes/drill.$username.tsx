import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { AppShell } from '@/components/AppShell'
import { DrillBoard } from '@/components/DrillBoard'
import { usePlayerData } from '@/lib/queries'
import { normalizeUsername } from '@/lib/username'
import type { Tables } from '@/lib/supabase/database.types'

type DrillSearch = {
  position?: string
  ids?: string
  motif?: string
  phase?: string
  color?: string
  classification?: string
  order?: 'worst' | 'random' | 'chrono'
}

export const Route = createFileRoute('/drill/$username')({
  validateSearch: (search: Record<string, unknown>): DrillSearch => ({
    position: typeof search.position === 'string' ? search.position : undefined,
    ids: typeof search.ids === 'string' ? search.ids : undefined,
    motif: typeof search.motif === 'string' ? search.motif : undefined,
    phase: typeof search.phase === 'string' ? search.phase : undefined,
    color: typeof search.color === 'string' ? search.color : undefined,
    classification: typeof search.classification === 'string' ? search.classification : undefined,
    order:
      search.order === 'random' || search.order === 'chrono' || search.order === 'worst'
        ? search.order
        : 'worst',
  }),
  component: DrillPage,
})

function selectPositions(all: Tables<'flagged_positions'>[], search: DrillSearch) {
  let rows = all
  if (search.ids) {
    const set = new Set(search.ids.split(',').filter(Boolean))
    rows = rows.filter((r) => set.has(r.id))
  }
  if (search.motif) rows = rows.filter((r) => r.motif === search.motif)
  if (search.phase) rows = rows.filter((r) => r.phase === search.phase)
  if (search.color) rows = rows.filter((r) => r.color === search.color)
  if (search.classification) rows = rows.filter((r) => r.classification === search.classification)

  if (search.order === 'chrono') {
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
    () => selectPositions(query.data?.positions ?? [], search),
    [query.data?.positions, search],
  )

  return (
    <AppShell username={name}>
      <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Drill</h1>
      <p className="mt-2 text-2xl">{name}</p>
      <p className="mt-2 mb-8 max-w-xl text-sm text-muted">
        Position on the board. Move first. Then the historical move and the engine line.
      </p>
      {query.isLoading ? (
        <p className="font-mono text-xs text-muted">Loading positions…</p>
      ) : (
        <DrillBoard username={name} positions={positions} />
      )}
    </AppShell>
  )
}
