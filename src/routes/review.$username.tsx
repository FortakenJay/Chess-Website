import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { GameReview } from '@/components/review/GameReview'
import { ReviewGamesList, type ReviewGameRow } from '@/components/review/ReviewGamesList'
import { ErrorText, LoadingText, PageHeader } from '@/components/ui'
import { analyzeGames, type AnalyzeProgress } from '@/lib/analyzeClient'
import { parseGameMeta } from '@/lib/analysis/parseGameMeta'
import type { GameAnalysis } from '@/lib/analysis/types'
import type { ChessComGame } from '@/lib/chesscom'
import { gameFromPgn } from '@/lib/chesscom'
import { findGameByUrl } from '@/lib/chesscom.functions'
import { useArchives, useMonthGames, useRecentGames } from '@/lib/queries'
import { normalizeUsername } from '@/lib/username'
import { playerHead } from '@/lib/pageTitle'
import { useSessionTitle } from '@/lib/useDocumentTitle'
import { btnGhost, btnPrimary, chipActive, chipIdle } from '@/components/review/reviewUi'
import { cn } from '@/lib/cn'

export const Route = createFileRoute('/review/$username')({
  head: ({ params }) => playerHead('Review', params.username),
  component: ReviewUsernamePage,
})

const LIMITS = [10, 20, 50] as const

function toRaw(game: ChessComGame) {
  return {
    pgn: game.pgn,
    url: game.url,
    endTime: game.endTime,
    white: game.white,
    black: game.black,
    whiteResult: game.whiteResult,
    blackResult: game.blackResult,
    whiteRating: game.whiteRating,
    blackRating: game.blackRating,
    timeClass: game.timeClass,
  }
}

function mergeGames(existing: ChessComGame[], incoming: ChessComGame[]) {
  const map = new Map<string, ChessComGame>()
  for (const game of [...existing, ...incoming]) map.set(game.url, game)
  return [...map.values()].sort((a, b) => b.endTime - a.endTime)
}

function rewritePgnColor(pgn: string, username: string, color: 'white' | 'black') {
  const key = color === 'white' ? 'White' : 'Black'
  if (new RegExp(`\\[${key}\\s+"`, 'i').test(pgn)) {
    return pgn.replace(new RegExp(`\\[${key}\\s+"[^"]*"\\]`, 'i'), `[${key} "${username}"]`)
  }
  return `[${key} "${username}"]\n${pgn}`
}

function ReviewUsernamePage() {
  const { username: raw } = Route.useParams()
  const username = normalizeUsername(raw)

  const [limit, setLimit] = useState<(typeof LIMITS)[number]>(20)
  const [source, setSource] = useState<'recent' | 'month'>('recent')
  const [monthKey, setMonthKey] = useState<string>('')
  const [extraGames, setExtraGames] = useState<ChessComGame[]>([])
  const [paste, setPaste] = useState('')
  const [pasteColor, setPasteColor] = useState<'white' | 'black'>('white')
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [pastePending, setPastePending] = useState(false)

  const [analyses, setAnalyses] = useState<Record<string, GameAnalysis>>({})
  const [analyzingLink, setAnalyzingLink] = useState<string | null>(null)
  const [queueRemaining, setQueueRemaining] = useState(0)
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null)
  const [selectedLink, setSelectedLink] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'underperforming'>('all')
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(() => new Set())
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  /** Latest game URL we already kicked off default analysis for. */
  const autoLatestRef = useRef<string | null>(null)

  const archivesQuery = useArchives(username)
  const monthParts = monthKey ? monthKey.split('-').map(Number) : [null, null]
  const monthYear = monthParts[0] && monthParts[0] > 0 ? monthParts[0] : null
  const monthNum = monthParts[1] && monthParts[1] > 0 ? monthParts[1] : null

  const recentQuery = useRecentGames(username, limit)
  const monthQuery = useMonthGames(username, source === 'month' ? monthYear : null, source === 'month' ? monthNum : null)

  const archiveOptions = useMemo(() => {
    const archives = archivesQuery.data ?? []
    return [...archives]
      .sort((a, b) => b.year - a.year || b.month - a.month)
      .slice(0, 36)
      .map((a) => ({
        key: `${a.year}-${String(a.month).padStart(2, '0')}`,
        label: `${a.year}-${String(a.month).padStart(2, '0')}`,
        year: a.year,
        month: a.month,
      }))
  }, [archivesQuery.data])

  const baseGames =
    source === 'month' ? (monthQuery.data ?? []) : (recentQuery.data ?? [])
  const games = useMemo(() => mergeGames(baseGames, extraGames), [baseGames, extraGames])

  const rows: ReviewGameRow[] = useMemo(() => {
    return games.flatMap((game) => {
      const meta = parseGameMeta(game, username)
      if (!meta) return []
      return [
        {
          meta,
          analysis: analyses[meta.gameLink] ?? null,
          analyzing: analyzingLink === meta.gameLink,
        },
      ]
    })
  }, [games, username, analyses, analyzingLink])

  const selectedAnalysis = selectedLink ? analyses[selectedLink] ?? null : null
  const loadingList =
    source === 'month'
      ? monthQuery.isLoading || (Boolean(monthKey) && monthQuery.isFetching)
      : recentQuery.isLoading

  const progressLabel = useMemo(() => {
    if (!analyzingLink || !progress) return null
    if (progress.phase === 'engine') return 'Starting Stockfish…'
    const extra = queueRemaining > 1 ? ` · ${queueRemaining} in queue` : ''
    return `Analyzing · move ${progress.ply}/${progress.plyTotal || '…'}${extra}`
  }, [analyzingLink, progress, queueRemaining])

  useSessionTitle({
    page: 'Review',
    library: username,
    enabled: !selectedAnalysis?.plies?.length,
    activity: progressLabel?.startsWith('Analyzing') ? 'Analyzing' : undefined,
  })

  useEffect(() => {
    autoLatestRef.current = null
  }, [username])

  async function analyzeQueue(links: string[], openFirst = false) {
    const pending = links
      .map((link) => games.find((g) => g.url === link))
      .filter((g): g is ChessComGame => Boolean(g))
      .filter((g) => !analyses[g.url]?.plies?.length)

    if (!pending.length) {
      if (openFirst && links[0] && analyses[links[0]]?.plies?.length) {
        setSelectedLink(links[0])
      }
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setAnalyzeError(null)

    try {
      for (let i = 0; i < pending.length; i++) {
        if (controller.signal.aborted) return
        const game = pending[i]!
        setAnalyzingLink(game.url)
        setQueueRemaining(pending.length - i)
        await analyzeGames([toRaw(game)], username, {
          includePlies: true,
          movetime: 60,
          signal: controller.signal,
          onProgress: setProgress,
          onGame: (analysis) => {
            setAnalyses((prev) => ({ ...prev, [analysis.gameLink]: analysis }))
            if (openFirst && i === 0) setSelectedLink(analysis.gameLink)
          },
        })
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      if (!controller.signal.aborted) {
        setAnalyzingLink(null)
        setProgress(null)
        setQueueRemaining(0)
      }
    }
  }

  // Always analyze + open the newest game once games are loaded.
  useEffect(() => {
    if (loadingList || analyzingLink) return
    const latest = games[0]
    if (!latest) return
    if (autoLatestRef.current === latest.url) return
    if (analyses[latest.url]?.plies?.length) {
      autoLatestRef.current = latest.url
      return
    }
    autoLatestRef.current = latest.url
    void analyzeQueue([latest.url], true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, games, loadingList, analyzingLink, analyses])

  function toggleSelect(link: string) {
    setSelectedLinks((prev) => {
      const next = new Set(prev)
      if (next.has(link)) next.delete(link)
      else next.add(link)
      return next
    })
  }

  async function importPaste() {
    const value = paste.trim()
    if (!value) return
    setPastePending(true)
    setPasteError(null)
    try {
      if (/chess\.com/i.test(value) || /^https?:\/\//i.test(value)) {
        const found = await findGameByUrl({ data: { username, url: value } })
        if (!found) {
          setPasteError('Could not find that Chess.com game in recent archives.')
          return
        }
        setExtraGames((prev) => mergeGames(prev, [found]))
        setSelectedLinks((prev) => new Set(prev).add(found.url))
        setPaste('')
        await analyzeQueue([found.url], true)
        return
      }

      let pgn = value
      const userInPgn =
        new RegExp(`\\[White\\s+"${username}"\\]`, 'i').test(pgn) ||
        new RegExp(`\\[Black\\s+"${username}"\\]`, 'i').test(pgn)
      if (!userInPgn) {
        pgn = rewritePgnColor(pgn, username, pasteColor)
      }
      const game = gameFromPgn(pgn, username)
      if (!game) {
        setPasteError('Could not parse that PGN.')
        return
      }
      const meta = parseGameMeta(game, username)
      if (!meta) {
        setPasteError(`PGN must include ${username} as White or Black (or pick a color below).`)
        return
      }
      setExtraGames((prev) => mergeGames(prev, [game]))
      setSelectedLinks((prev) => new Set(prev).add(game.url))
      setPaste('')
      await analyzeQueue([game.url], true)
    } catch (err) {
      setPasteError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setPastePending(false)
    }
  }

  return (
    <AppShell username={username} dense={Boolean(selectedAnalysis?.plies?.length)}>
      {selectedAnalysis?.plies?.length ? (
        <GameReview analysis={selectedAnalysis} onBack={() => setSelectedLink(null)} />
      ) : (
        <>
          <PageHeader
            title="Free review"
            username={username}
            description="Load more games, pick specific ones, or paste a Chess.com URL / PGN. Nothing is written to the database."
            actions={
              <button
                type="button"
                className={cn(btnGhost, 'inline-flex min-h-11 items-center justify-center px-3 font-mono text-xs')}
                onClick={() => {
                  abortRef.current?.abort()
                  autoLatestRef.current = null
                  setAnalyses({})
                  setSelectedLinks(new Set())
                  setSelectedLink(null)
                  setExtraGames([])
                  setAnalyzeError(null)
                  void (source === 'month' ? monthQuery.refetch() : recentQuery.refetch())
                }}
              >
                Refresh
              </button>
            }
          />

          <div className="mt-6 grid gap-4 border border-line bg-surface p-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted">Load games</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSource('recent')}
                  className={cn(
                    'inline-flex min-h-11 items-center px-3 font-mono text-xs uppercase tracking-wider',
                    source === 'recent' ? chipActive : chipIdle,
                  )}
                >
                  Recent
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSource('month')
                    if (!monthKey && archiveOptions[0]) setMonthKey(archiveOptions[0].key)
                  }}
                  className={cn(
                    'inline-flex min-h-11 items-center px-3 font-mono text-xs uppercase tracking-wider',
                    source === 'month' ? chipActive : chipIdle,
                  )}
                >
                  By month
                </button>
              </div>

              {source === 'recent' ? (
                <div className="flex flex-wrap gap-2">
                  {LIMITS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLimit(n)}
                      className={cn(
                        'inline-flex min-h-11 items-center px-3 font-mono text-xs',
                        limit === n ? chipActive : chipIdle,
                      )}
                    >
                      Last {n}
                    </button>
                  ))}
                </div>
              ) : (
                <label className="block text-sm">
                  <span className="sr-only">Archive month</span>
                  <select
                    value={monthKey}
                    onChange={(e) => setMonthKey(e.target.value)}
                    className="min-h-11 w-full border border-line bg-canvas px-3 font-mono text-base sm:text-sm"
                  >
                    <option value="">Select month…</option>
                    {archiveOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="space-y-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                Specific game
              </p>
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder="Paste a Chess.com game URL or full PGN…"
                rows={4}
                className="w-full resize-y border border-line bg-canvas px-3 py-2 font-mono text-xs"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-muted">If PGN lacks your name:</span>
                <button
                  type="button"
                  onClick={() => setPasteColor('white')}
                  className={cn(
                    'inline-flex min-h-11 items-center px-3 font-mono text-xs',
                    pasteColor === 'white' ? chipActive : chipIdle,
                  )}
                >
                  I was White
                </button>
                <button
                  type="button"
                  onClick={() => setPasteColor('black')}
                  className={cn(
                    'inline-flex min-h-11 items-center px-3 font-mono text-xs',
                    pasteColor === 'black' ? chipActive : chipIdle,
                  )}
                >
                  I was Black
                </button>
                <button
                  type="button"
                  disabled={pastePending || !paste.trim()}
                  onClick={() => void importPaste()}
                  className={cn(btnPrimary, 'inline-flex min-h-11 w-full items-center justify-center px-3 text-sm sm:ml-auto sm:w-auto')}
                >
                  {pastePending ? 'Importing…' : 'Import & analyze'}
                </button>
              </div>
              {pasteError ? <ErrorText className="mt-0">{pasteError}</ErrorText> : null}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={!selectedLinks.size || Boolean(analyzingLink)}
              onClick={() => void analyzeQueue([...selectedLinks])}
              className={cn(btnPrimary, 'inline-flex min-h-11 items-center justify-center px-3 text-sm')}
            >
              Analyze selected ({selectedLinks.size})
            </button>
            <button
              type="button"
              disabled={!rows.length || Boolean(analyzingLink)}
              onClick={() =>
                void analyzeQueue(
                  rows.filter((r) => !r.analysis).map((r) => r.meta.gameLink),
                )
              }
              className={cn(btnGhost, 'inline-flex min-h-11 items-center justify-center px-3 text-sm')}
            >
              Analyze all unanalyzed
            </button>
            <button
              type="button"
              disabled={!rows.length}
              onClick={() =>
                setSelectedLinks(new Set(rows.map((r) => r.meta.gameLink)))
              }
              className={cn(btnGhost, 'inline-flex min-h-11 items-center justify-center px-3 font-mono text-xs')}
            >
              Select all
            </button>
            <button
              type="button"
              disabled={!selectedLinks.size}
              onClick={() => setSelectedLinks(new Set())}
              className={cn(btnGhost, 'inline-flex min-h-11 items-center justify-center px-3 font-mono text-xs')}
            >
              Clear selection
            </button>
            {analyzingLink ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="inline-flex min-h-11 items-center justify-center border border-blunder/40 px-3 font-mono text-xs uppercase tracking-[0.06em] text-blunder-text hover:bg-blunder/10"
              >
                Stop
              </button>
            ) : null}
          </div>

          {loadingList ? <LoadingText>Loading games…</LoadingText> : null}
          {recentQuery.isError || monthQuery.isError ? (
            <ErrorText>Could not load games from Chess.com.</ErrorText>
          ) : null}
          {analyzeError ? <ErrorText>{analyzeError}</ErrorText> : null}

          {rows.length > 0 ? (
            <div className="mt-6">
              <ReviewGamesList
                rows={rows}
                filter={filter}
                onFilterChange={setFilter}
                progressLabel={progressLabel}
                selectedLinks={selectedLinks}
                onToggleSelect={toggleSelect}
                title={
                  source === 'month' && monthKey
                    ? `${monthKey} · ${rows.length} games`
                    : `Last ${rows.length} games`
                }
                onSelect={(link) => {
                  if (analyses[link]?.plies?.length) {
                    setSelectedLink(link)
                    return
                  }
                  void analyzeQueue([link], true)
                }}
              />
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  )
}
