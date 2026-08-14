import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { analyzeGames } from '@/lib/analyzeClient'
import type { GameAnalysis } from '@/lib/analysis/types'
import { useAuth } from '@/lib/auth'
import { listArchives, listMonthGames } from '@/lib/chesscom.functions'
import { fetchAllRows, markSyncState, persistGames } from '@/lib/persist'
import { getBrowserClient } from '@/lib/supabase/browser'

const DOWNLOAD_BATCH_MONTHS = 2
const SAVE_BATCH_GAMES = 10

export type BackgroundSyncState = {
  username: string | null
  phase: 'idle' | 'checking' | 'syncing' | 'complete' | 'error'
  detail: string
  done: number
  total: number
  saved: number
  flagged: number
  skipped: number
  error: string | null
}

type BackgroundSyncContextValue = BackgroundSyncState & {
  retry: () => void
}

const INITIAL_STATE: BackgroundSyncState = {
  username: null,
  phase: 'idle',
  detail: 'Waiting for a linked Chess.com account.',
  done: 0,
  total: 0,
  saved: 0,
  flagged: 0,
  skipped: 0,
  error: null,
}

const BackgroundSyncContext = createContext<BackgroundSyncContextValue | null>(null)

function aborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
}

async function syncGames(
  username: string,
  signal: AbortSignal,
  update: React.Dispatch<React.SetStateAction<BackgroundSyncState>>,
  invalidate: () => Promise<void>,
) {
  const supabase = getBrowserClient()
  update({
    ...INITIAL_STATE,
    username,
    phase: 'checking',
    detail: 'Checking saved games…',
  })

  const [savedRows, syncResult, archives] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from('games')
        .select('game_link')
        .eq('username', username)
        .range(from, to),
    ),
    supabase
      .from('sync_state')
      .select('last_game_end_time')
      .eq('username', username)
      .maybeSingle(),
    listArchives({ data: { username } }),
  ])
  aborted(signal)
  if (syncResult.error) throw syncResult.error

  const savedLinks = new Set(savedRows.map((row) => row.game_link))
  const since = syncResult.data?.last_game_end_time ?? 0
  const months = (since
    ? archives.filter((month) => {
        const stamp = Date.UTC(month.year, month.month - 1, 1) / 1000
        return stamp + 32 * 86400 >= since
      })
    : archives
  ).sort((a, b) => a.year - b.year || a.month - b.month)

  let saved = 0
  let flagged = 0
  let discovered = 0
  let analyzed = 0
  let maxEndTime = since
  const pending: GameAnalysis[] = []

  update((current) => ({
    ...current,
    phase: 'syncing',
    skipped: savedLinks.size,
    detail:
      months.length === 0
        ? 'No Chess.com archives found.'
        : `Scanning ${months.length} archive month${months.length === 1 ? '' : 's'}…`,
  }))

  async function flush() {
    if (pending.length === 0) return
    const batch = pending.splice(0, pending.length)
    await persistGames(supabase, batch, { updateSyncState: false })
    saved += batch.length
    await invalidate()
    update((current) => ({
      ...current,
      saved,
      flagged,
      detail: `Saved ${saved} new game${saved === 1 ? '' : 's'} in the background…`,
    }))
  }

  for (let offset = 0; offset < months.length; offset += DOWNLOAD_BATCH_MONTHS) {
    aborted(signal)
    const monthBatch = months.slice(offset, offset + DOWNLOAD_BATCH_MONTHS)
    const batchNumber = Math.floor(offset / DOWNLOAD_BATCH_MONTHS) + 1
    const batchTotal = Math.ceil(months.length / DOWNLOAD_BATCH_MONTHS)

    update((current) => ({
      ...current,
      detail: `Scanning archive batch ${batchNumber} of ${batchTotal}…`,
    }))
    const responses = await Promise.all(
      monthBatch.map((month) =>
        listMonthGames({
          data: {
            username,
            year: month.year,
            month: month.month,
            since: since || undefined,
          },
        }),
      ),
    )
    aborted(signal)

    const downloaded = responses.flat().sort((a, b) => a.endTime - b.endTime)
    const games = downloaded.filter((game) => !savedLinks.has(game.url))
    for (const game of downloaded) maxEndTime = Math.max(maxEndTime, game.endTime)
    discovered += games.length
    update((current) => ({ ...current, total: discovered }))
    if (games.length === 0) continue

    await analyzeGames(games, username, {
      movetime: 80,
      signal,
      onProgress: ({ phase, gamesDone, gamesTotal, ply, plyTotal }) => {
        if (phase === 'engine') {
          update((current) => ({ ...current, detail: 'Starting Stockfish in the background…' }))
          return
        }
        const gameNumber = Math.min(gamesDone + 1, gamesTotal)
        update((current) => ({
          ...current,
          done: Math.min(analyzed + gamesDone, discovered),
          detail:
            plyTotal > 0
              ? `Analyzing game ${gameNumber} of ${gamesTotal}, move ${ply} of ${plyTotal}…`
              : `Analyzing game ${gameNumber} of ${gamesTotal}…`,
        }))
      },
      onGame: async (analysis) => {
        pending.push(analysis)
        savedLinks.add(analysis.gameLink)
        flagged += analysis.flagged.length
        if (pending.length >= SAVE_BATCH_GAMES) await flush()
      },
    })
    analyzed += games.length
    update((current) => ({ ...current, done: analyzed }))
    await flush()
  }

  aborted(signal)
  await flush()
  await markSyncState(supabase, username, maxEndTime)
  await invalidate()
  update((current) => ({
    ...current,
    phase: 'complete',
    done: discovered,
    total: discovered,
    detail:
      saved === 0
        ? `Up to date. ${savedLinks.size} saved game${savedLinks.size === 1 ? '' : 's'} skipped.`
        : `Background sync complete. Saved ${saved} new game${saved === 1 ? '' : 's'}.`,
  }))
}

export function BackgroundSyncProvider({ children }: { children: ReactNode }) {
  const { ready, user, profile } = useAuth()
  const queryClient = useQueryClient()
  const [state, setState] = useState<BackgroundSyncState>(INITIAL_STATE)
  const [attempt, setAttempt] = useState(0)
  const username = profile?.chess_com_username ?? null

  useEffect(() => {
    if (!ready || !user || !username) {
      setState(INITIAL_STATE)
      return
    }

    const controller = new AbortController()
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ['player', username] })

    void syncGames(username, controller.signal, setState, invalidate).catch((error) => {
      if (controller.signal.aborted) return
      setState((current) => ({
        ...current,
        phase: 'error',
        error: error instanceof Error ? error.message : String(error),
        detail: 'Background sync stopped.',
      }))
    })

    return () => controller.abort()
  }, [attempt, queryClient, ready, user, username])

  const retry = useCallback(() => setAttempt((current) => current + 1), [])
  const value = useMemo(() => ({ ...state, retry }), [retry, state])

  return (
    <BackgroundSyncContext.Provider value={value}>
      {children}
    </BackgroundSyncContext.Provider>
  )
}

export function useBackgroundSync() {
  const context = useContext(BackgroundSyncContext)
  if (!context) {
    throw new Error('useBackgroundSync must be used within BackgroundSyncProvider')
  }
  return context
}
