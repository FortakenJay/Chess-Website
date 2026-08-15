import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import {
  EMPTY_FILTERS,
  filterPositions,
  PositionsTable,
  type PositionFilters,
} from '@/components/PositionsTable'
import { PageHeader, PositionsSkeleton } from '@/components/ui'
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
      <PageHeader
        title="Positions"
        username={name}
        description="Every flagged move, browsable. Drill is the forced-guess version of the same set."
      />
      {query.isLoading ? (
        <PositionsSkeleton />
      ) : (
        <div className="mt-8">
          <PositionsTable username={name} rows={rows} filters={filters} onChange={setFilters} />
        </div>
      )}
    </AppShell>
  )
}
