import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { PuzzleBoard } from '@/components/PuzzleBoard'
import { PuzzleFilterTiles } from '@/components/PuzzleFilterTiles'
import {
  Button,
  EmptyState,
  ErrorText,
  FilterBar,
  PageHeader,
  PuzzlesFiltersSkeleton,
  BoardPageSkeleton,
  SelectField,
} from '@/components/ui'
import { usePuzzlePractice } from '@/lib/puzzles/usePuzzlePractice'
import type { PuzzleFilters } from '@/lib/puzzles/types'
import { MOTIF_LABEL, ALL_MOTIFS } from '@/lib/stats'
import { normalizeUsername } from '@/lib/username'

export const Route = createFileRoute('/puzzles/$username')({
  component: PuzzlesPage,
})

const MOTIF_OPTIONS = ['', ...ALL_MOTIFS] as const

function PuzzlesPage() {
  const { username } = Route.useParams()
  const name = normalizeUsername(username)
  const practice = usePuzzlePractice(name)

  const boardKey = `${puzzleCacheIdentity(practice.applied)}-${practice.puzzles[0]?.id ?? 'empty'}-${practice.reloadToken}`
  const ratingLabel =
    practice.elo != null
      ? `${practice.elo}${practice.ratings?.primaryClass ? ` ${practice.ratings.primaryClass}` : ''}`
      : '—'
  const playing = !practice.loading && practice.puzzles.length > 0

  if (!practice.ready) {
    return (
      <AppShell username={name}>
        <PageHeader
          title="Puzzles"
          username={name}
          description="Train by phase, motif, and Elo — filters start from your Chess.com rating and recent leaks."
        />
        <PuzzlesFiltersSkeleton />
      </AppShell>
    )
  }

  const filtersPanel = (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Chess.com Elo
          </p>
          <p className="mt-1 font-mono text-3xl tabular tracking-tight">{ratingLabel}</p>
          {practice.ratings ? (
            <p className="mt-1 font-mono text-xs text-muted">
              blitz {practice.ratings.blitz ?? '—'} · rapid {practice.ratings.rapid ?? '—'} · bullet{' '}
              {practice.ratings.bullet ?? '—'}
            </p>
          ) : (
            <p className="mt-1 font-mono text-xs text-muted">Loading ratings…</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Catalog</p>
          <p className="mt-1 font-mono text-xl tabular">{practice.catalogTotal}</p>
          <Button
            className="mt-2"
            variant="ghost"
            disabled={practice.expanding || practice.loading}
            onClick={() => void practice.growCatalog()}
          >
            {practice.expanding ? 'Downloading…' : 'Download more puzzles'}
          </Button>
        </div>
      </div>

      {practice.expandNote ? (
        <p className="mt-3 font-mono text-xs text-pretty text-muted">{practice.expandNote}</p>
      ) : (
        <p className="mt-3 font-mono text-xs text-pretty text-muted">
          In-app download uses Lichess’s small batch API. For the full dump run{' '}
          <span className="text-ink">npm run puzzles:import-full</span>.
        </p>
      )}

      <PuzzleFilterTiles
        focus={practice.filters.focus}
        ratingBand={practice.filters.ratingBand}
        onFocus={practice.applyFocus}
        onBand={practice.applyBand}
      />

      <section className="mt-6">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Motif</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {MOTIF_OPTIONS.map((motif) => {
            const active = practice.filters.motif === motif
            const label = motif === '' ? 'All motifs' : MOTIF_LABEL[motif]
            return (
              <button
                key={motif || 'all'}
                type="button"
                className={`border px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] transition-colors ${
                  active
                    ? 'border-ink bg-ink text-canvas'
                    : 'border-line bg-surface text-ink hover:bg-surface-2'
                }`}
                onClick={() => practice.updateFilter('motif', motif)}
              >
                {label}
              </button>
            )
          })}
        </div>
      </section>

      <div className="mt-6">
        <FilterBar>
          <SelectField
            label="Color"
            value={practice.filters.color}
            onChange={(color) =>
              practice.updateFilter('color', color as PuzzleFilters['color'])
            }
            options={['', 'white', 'black']}
          />
          <SelectField
            label="Source"
            value={practice.filters.source}
            onChange={(source) =>
              practice.updateFilter('source', source as PuzzleFilters['source'])
            }
            options={['', 'lichess', 'chesscom']}
            labels={{ '': 'all', lichess: 'lichess', chesscom: 'chess.com' }}
          />
          <Button
            className="ml-auto"
            disabled={practice.loading || practice.expanding}
            onClick={practice.bumpReload}
          >
            {practice.loading ? 'Loading…' : 'Load more'}
          </Button>
        </FilterBar>
      </div>

      {practice.filters.ratingMin !== '' || practice.filters.ratingMax !== '' ? (
        <p className="mt-3 font-mono text-xs text-muted">
          Rating window{' '}
          <span className="tabular text-ink">
            {practice.filters.ratingMin === '' ? '…' : practice.filters.ratingMin}–
            {practice.filters.ratingMax === '' ? '…' : practice.filters.ratingMax}
          </span>
        </p>
      ) : null}
    </>
  )

  return (
    <AppShell username={name} dense={playing}>
      {playing ? (
        <>
          <details className="mb-3 border border-line bg-surface">
            <summary className="cursor-pointer list-none px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-muted marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="text-ink">Filters</span>
              <span className="mx-2 text-line">·</span>
              <span className="tabular">{ratingLabel}</span>
              <span className="mx-2 text-line">·</span>
              <span className="tabular">{practice.catalogTotal} puzzles</span>
              <span className="float-right text-muted">Edit</span>
            </summary>
            <div className="max-h-[40dvh] overflow-y-auto border-t border-line px-3 py-4">
              {filtersPanel}
            </div>
          </details>
          {practice.relaxed ? (
            <p className="mb-2 font-mono text-xs text-pretty text-muted">
              No exact matches — showing a broader set.
            </p>
          ) : null}
          <PuzzleBoard key={boardKey} puzzles={practice.puzzles} />
        </>
      ) : (
        <>
          <PageHeader
            title="Puzzles"
            username={name}
            description="Train by phase, motif, and Elo — filters start from your Chess.com rating and recent leaks."
          />
          <div className="mt-6">{filtersPanel}</div>
          {practice.loading ? <BoardPageSkeleton label="Finding puzzles" className="mt-6" /> : null}
          {practice.error ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ErrorText>{practice.error}</ErrorText>
              <Button variant="ghost" onClick={practice.bumpReload}>
                Try again
              </Button>
            </div>
          ) : null}
          {!practice.loading && !practice.error && practice.puzzles.length === 0 ? (
            <EmptyState className="mt-8 max-w-lg">
              <p className="text-pretty">No puzzles available for these filters right now.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => void practice.growCatalog()} disabled={practice.expanding}>
                  {practice.expanding ? 'Downloading…' : 'Download more puzzles'}
                </Button>
                <Button variant="ghost" onClick={practice.clearFilters}>
                  Reset filters
                </Button>
              </div>
            </EmptyState>
          ) : null}
        </>
      )}
    </AppShell>
  )
}

function puzzleCacheIdentity(filters: PuzzleFilters) {
  return [
    filters.focus,
    filters.phase,
    filters.motif,
    filters.color,
    filters.source,
    filters.ratingBand,
    filters.ratingMin,
    filters.ratingMax,
  ].join('|')
}
