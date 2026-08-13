import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import {
  EMPTY_FILTERS,
  filterPositions,
  PositionsTable,
  type PositionFilters,
} from '@/components/PositionsTable'
import { usePlayerData } from '@/lib/queries'
import { normalizeUsername } from '@/lib/username'

export const Route = createFileRoute('/positions/$username')({
  component: PositionsPage,
})

function PositionsPage() {
  const { username } = Route.useParams()
  const name = normalizeUsername(username)
  const query = usePlayerData(name)
  const [filters, setFilters] = useState<PositionFilters>(EMPTY_FILTERS)
  const rows = useMemo(
    () => filterPositions(query.data?.positions ?? [], filters),
    [query.data?.positions, filters],
  )

  return (
    <AppShell username={name}>
      <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Positions</h1>
      <p className="mt-2 text-2xl">{name}</p>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Every flagged move, browsable. Drill is the forced-guess version of the same set.
      </p>
      {query.isLoading ? (
        <p className="mt-8 font-mono text-xs text-muted">Loading positions…</p>
      ) : (
        <div className="mt-8">
          <PositionsTable username={name} rows={rows} filters={filters} onChange={setFilters} />
        </div>
      )}
    </AppShell>
  )
}
