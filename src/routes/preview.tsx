import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { PreviewErrors } from '@/components/PreviewErrors'
import type { PreviewPosition } from '@/components/PreviewErrors'
import type { FlaggedPosition } from '@/lib/analysis/types'
import { usePlayerData } from '@/lib/queries'

export const Route = createFileRoute('/preview')({
  component: PreviewPage,
})

const PREVIEW_USERNAME = 'hikaru'
const PREVIEW_DISPLAY_NAME = 'Hikaru Nakamura'

function PreviewPage() {
  const query = usePlayerData(PREVIEW_USERNAME)
  const games = query.data?.games ?? []
  const [selectedGameLink, setSelectedGameLink] = useState<string | null>(null)
  const flagged = useMemo<PreviewPosition[]>(
    () =>
      (query.data?.positions ?? []).map((row) => ({
        id: row.id,
        username: row.username,
        playedOn: row.played_on,
        opponent: row.opponent,
        color: row.color as FlaggedPosition['color'],
        moveNumber: row.move_number,
        san: row.san,
        loss: row.loss,
        classification: row.classification as FlaggedPosition['classification'],
        phase: row.phase as FlaggedPosition['phase'],
        clockLeft: row.clock_left,
        fenBefore: row.fen_before,
        gameLink: row.game_link,
        motif: row.motif as FlaggedPosition['motif'],
      })),
    [query.data?.positions],
  )
  const sortedGames = useMemo(
    () => [...games].sort((a, b) => b.played_on.localeCompare(a.played_on)),
    [games],
  )
  const selectedGame =
    sortedGames.find((game) => game.game_link === selectedGameLink) ?? null
  const selectedPositions = useMemo(
    () => flagged.filter((position) => position.gameLink === selectedGameLink),
    [flagged, selectedGameLink],
  )

  return (
    <AppShell hideSignup>
      <div>
        <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Preview</h1>
        <p className="mt-2 font-mono text-2xl">{PREVIEW_DISPLAY_NAME}</p>
        <p className="mt-1 font-mono text-xs text-muted">
          Choose a game, then play through its engine-verified mistakes. No account required.
        </p>
      </div>

      {query.isLoading ? (
        <p className="mt-8 font-mono text-xs text-muted">Loading saved preview…</p>
      ) : null}

      {query.isError ? (
        <p className="mt-8 text-sm text-blunder" role="alert">
          Could not load the saved preview.
        </p>
      ) : null}

      {sortedGames.length > 0 && !selectedGame ? (
        <section className="mt-8" aria-labelledby="preview-games-heading">
          <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
            <div>
              <h2 id="preview-games-heading" className="font-mono text-lg">
                Games
              </h2>
              <p className="mt-1 text-sm text-muted">Select a game to inspect its mistakes.</p>
            </div>
            <span className="font-mono text-xs text-muted">{sortedGames.length} saved</span>
          </div>
          <div className="divide-y divide-line border-x border-b border-line">
            {sortedGames.map((game, index) => {
              const errorCount = flagged.filter(
                (position) => position.gameLink === game.game_link,
              ).length
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedGameLink(game.game_link)}
                  className="group grid w-full gap-3 bg-surface px-4 py-4 text-left hover:bg-surface-2 sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:items-center"
                >
                  <span className="font-mono text-xs text-muted">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className="block text-base">
                      Hikaru vs {game.opponent}
                    </span>
                    <span className="mt-1 block font-mono text-xs text-muted">
                      {game.played_on} · {game.color} · {game.result} · {game.total_moves} moves
                    </span>
                  </span>
                  <span className="font-mono text-xs text-muted group-hover:text-ink">
                    {errorCount} {errorCount === 1 ? 'mistake' : 'mistakes'} →
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {selectedGame ? (
        <section className="mt-8" aria-labelledby="selected-game-heading">
          <button
            type="button"
            onClick={() => setSelectedGameLink(null)}
            className="font-mono text-xs text-muted hover:text-ink"
          >
            ← All games
          </button>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-muted">
                {selectedGame.played_on} · {selectedGame.color} · {selectedGame.result}
              </p>
              <h2 id="selected-game-heading" className="mt-1 font-mono text-xl">
                Hikaru vs {selectedGame.opponent}
              </h2>
            </div>
            <span className="font-mono text-xs text-muted">
              {selectedPositions.length}{' '}
              {selectedPositions.length === 1 ? 'mistake' : 'mistakes'}
            </span>
          </div>
          {selectedPositions.length > 0 ? (
            <div className="mt-4">
              <PreviewErrors key={selectedGame.id} rows={selectedPositions} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No engine-flagged mistakes in this game.</p>
          )}
        </section>
      ) : null}

      {!query.isLoading && !query.isError && sortedGames.length === 0 ? (
        <p className="mt-8 text-sm text-muted">The preview dataset is not available yet.</p>
      ) : null}

      {sortedGames.length > 0 && flagged.length === 0 ? (
        <div className="mt-4">
          <p className="text-sm text-muted">No engine-flagged mistakes in these games.</p>
        </div>
      ) : null}
    </AppShell>
  )
}
