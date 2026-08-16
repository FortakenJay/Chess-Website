import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isAnalysisStale } from '@/lib/analysis/types'
import { analyzeGames } from '@/lib/analyzeClient'
import { useAuth } from '@/lib/auth'
import { cachePlayerAvatar, listArchives, listMonthGames } from '@/lib/chesscom.functions'
import { fetchAllRows, markSyncState, persistGames, purgeExpiredGames } from '@/lib/persist'
import { refreshPlayerData } from '@/lib/queries'
import { errorMessage } from '@/lib/errorMessage'
import { getBrowserClient } from '@/lib/supabase/browser'
import { runUserSync, type SyncProgress } from '@/lib/sync/runSync'

export type SyncMode = 'full' | 'today' | 'reanalyze'

export type BackgroundSyncState = {
  username: string | null
  phase: 'idle' | 'checking' | 'syncing' | 'complete' | 'error'
  mode: SyncMode
  detail: string
  done: number
  total: number
  saved: number
  flagged: number
  skipped: number
  libraryCount: number
  chesscomSeen: number
  monthsDone: number
  monthsTotal: number
  historyComplete: boolean
  error: string | null
}

type BackgroundSyncContextValue = BackgroundSyncState & {
  start: () => void
  retry: () => void
  resyncToday: () => void
  reanalyze: () => void
}

const INITIAL_STATE: BackgroundSyncState = {
  username: null,
  phase: 'idle',
  mode: 'full',
  detail: 'Open Sync to import Chess.com games into your library.',
  done: 0,
  total: 0,
  saved: 0,
  flagged: 0,
  skipped: 0,
  libraryCount: 0,
  chesscomSeen: 0,
  monthsDone: 0,
  monthsTotal: 0,
  historyComplete: false,
  error: null,
}

const BackgroundSyncContext = createContext<BackgroundSyncContextValue | null>(null)

function startOfTodayUtcSec() {
  const now = new Date()
  return Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000,
  )
}

function detailFromProgress(
  event: SyncProgress,
  mode: SyncMode,
): Partial<BackgroundSyncState> | null {
  switch (event.type) {
    case 'checking':
      return {
        phase: 'checking',
        detail:
          mode === 'today'
            ? 'Looking for today’s newest Chess.com games…'
            : mode === 'reanalyze'
              ? 'Finding games that still have the old engine scores…'
              : 'Checking your saved library…',
      }
    case 'scanning':
      return {
        phase: 'syncing',
        monthsTotal: event.months,
        done: 0,
        total: event.months,
        detail:
          mode === 'today'
            ? event.months === 0
              ? 'No Chess.com archives found.'
              : 'Scanning for games from today…'
            : event.months === 0
              ? 'No Chess.com archives found.'
              : mode === 'reanalyze'
                ? `Reanalyzing stale games across ${event.months} archive month${event.months === 1 ? '' : 's'}…`
                : `Preparing ${event.months} archive month${event.months === 1 ? '' : 's'} (full history)…`,
      }
    case 'month_batch':
      return {
        monthsDone: event.monthsDone,
        monthsTotal: event.monthsTotal,
        done: event.monthsDone,
        total: event.monthsTotal,
        libraryCount: event.libraryCount,
        chesscomSeen: event.chesscomSeen,
        detail:
          mode === 'today'
            ? `Checking today’s games · ${event.libraryCount} saved in library…`
            : mode === 'reanalyze'
              ? `Reanalyze ${event.monthsDone}/${event.monthsTotal} · ${event.libraryCount} in library${
                  event.chesscomSeen > 0
                    ? ` · ${event.chesscomSeen} standard games seen`
                    : ''
                }…`
              : `Scanning Chess.com months ${event.monthsDone}/${event.monthsTotal} · ${event.libraryCount} saved in library${
                  event.chesscomSeen > 0
                    ? ` · ${event.chesscomSeen} standard games seen`
                    : ''
                }…`,
      }
    case 'analyzing':
      if (event.phase === 'engine') {
        return {
          detail: 'Starting Stockfish…',
          libraryCount: event.libraryCount,
          chesscomSeen: event.chesscomSeen,
          monthsDone: event.monthsDone,
          monthsTotal: event.monthsTotal,
          done: event.monthsDone,
          total: event.monthsTotal,
        }
      }
      return {
        libraryCount: event.libraryCount,
        chesscomSeen: event.chesscomSeen,
        monthsDone: event.monthsDone,
        monthsTotal: event.monthsTotal,
        done: event.monthsDone,
        total: event.monthsTotal,
        detail:
          event.plyTotal > 0
            ? `Month ${event.monthsDone}/${event.monthsTotal} · analyzing game ${Math.min(event.gamesDone + 1, event.gamesTotal)} of ${event.gamesTotal} (move ${event.ply}/${event.plyTotal}) · library ${event.libraryCount}`
            : `Month ${event.monthsDone}/${event.monthsTotal} · analyzing game ${Math.min(event.gamesDone + 1, event.gamesTotal)} of ${event.gamesTotal} · library ${event.libraryCount}`,
      }
    case 'saved':
      return {
        saved: event.saved,
        flagged: event.flagged,
        libraryCount: event.libraryCount,
        chesscomSeen: event.chesscomSeen,
        detail:
          mode === 'reanalyze'
            ? `Rewrote ${event.saved} game${event.saved === 1 ? '' : 's'} · library ${event.libraryCount}…`
            : `Saved ${event.saved} new this session · library ${event.libraryCount}…`,
      }
    case 'complete':
      return {
        phase: 'complete',
        done: event.monthsTotal,
        total: event.monthsTotal,
        saved: event.saved,
        flagged: event.flagged,
        skipped: event.skipped,
        libraryCount: event.libraryCount,
        chesscomSeen: event.chesscomSeen,
        monthsDone: event.monthsTotal,
        monthsTotal: event.monthsTotal,
        historyComplete: mode === 'today' ? true : event.historyComplete,
        detail:
          mode === 'today'
            ? event.saved === 0
              ? `No new games from today. Library has ${event.libraryCount} standard games.`
              : `Added ${event.saved} game${event.saved === 1 ? '' : 's'} from today · library now ${event.libraryCount}.`
            : mode === 'reanalyze'
              ? event.saved === 0
                ? `No stale games left to rewrite. Library has ${event.libraryCount} standard games.`
                : `Rewrote ${event.saved} game${event.saved === 1 ? '' : 's'} with the current engine · library ${event.libraryCount}.`
              : event.historyComplete
              ? event.saved === 0
                ? `Finished every Chess.com month. Library has ${event.libraryCount} standard games (${event.chesscomSeen} seen this pass). Variants like bughouse are skipped.`
                : `Finished every Chess.com month. Added ${event.saved} this session · library now ${event.libraryCount} standard games (${event.chesscomSeen} seen this pass).`
              : `Sync pass finished early. Library has ${event.libraryCount} games — run Sync again to keep importing older months.`,
      }
    default:
      return null
  }
}

async function syncGames(
  username: string,
  signal: AbortSignal,
  update: React.Dispatch<React.SetStateAction<BackgroundSyncState>>,
  mode: SyncMode,
) {
  const supabase = getBrowserClient()
  void cachePlayerAvatar({ data: { username, force: true } }).catch(() => {})
  update({
    ...INITIAL_STATE,
    username,
    mode,
    phase: 'checking',
    detail:
      mode === 'today'
        ? 'Looking for today’s newest Chess.com games…'
        : mode === 'reanalyze'
          ? 'Finding games that still have the old engine scores…'
          : 'Checking your saved library…',
  })

  const todayFloor = startOfTodayUtcSec() - 1
  const staleLinks =
    mode === 'reanalyze'
      ? new Set(
          (
            await fetchAllRows((from, to) =>
              supabase
                .from('games')
                .select('game_link, analysis_version')
                .eq('username', username)
                .range(from, to),
            )
          )
            .filter((row) => isAnalysisStale(row.analysis_version))
            .map((row) => row.game_link),
        )
      : null

  await runUserSync(username, {
    signal,
    history: mode === 'today' ? 'incremental' : mode === 'reanalyze' ? 'reanalyze' : 'full',
    maxMonthsWithoutSince: mode === 'today' ? 1 : undefined,
    shouldAnalyze: staleLinks
      ? (game) => staleLinks.has(game.url)
      : undefined,
    listArchives: (name) => listArchives({ data: { username: name } }),
    listMonthGames: (name, year, month, since) =>
      listMonthGames({
        data: { username: name, year, month, since },
      }),
    getSavedGameLinks: async (name) => {
      const rows = await fetchAllRows((from, to) =>
        supabase.from('games').select('game_link').eq('username', name).range(from, to),
      )
      return new Set(rows.map((row) => row.game_link))
    },
    getSinceEndTime: async (name) => {
      if (mode === 'today') return todayFloor
      const { data, error } = await supabase
        .from('sync_state')
        .select('last_game_end_time')
        .eq('username', name)
        .maybeSingle()
      if (error) throw error
      return data?.last_game_end_time ?? 0
    },
    analyzeBatch: (games, name, options) => analyzeGames(games, name, options),
    persistBatch: (analyses) => persistGames(supabase, analyses, { updateSyncState: false }),
    markSync: (name, maxEndTime) => markSyncState(supabase, name, maxEndTime),
    purgeExpired: () => purgeExpiredGames(supabase),
    onProgress: (event) => {
      const patch = detailFromProgress(event, mode)
      if (!patch) return
      update((current) => ({ ...current, ...patch }))
    },
  })
}

export function BackgroundSyncProvider({ children }: { children: ReactNode }) {
  const { ready, user, profile, refreshProfile } = useAuth()
  const queryClient = useQueryClient()
  const [state, setState] = useState<BackgroundSyncState>(INITIAL_STATE)
  const [runId, setRunId] = useState(0)
  const activeRun = useRef(0)
  const modeRef = useRef<SyncMode>('full')
  const username = profile?.chess_com_username ?? null

  useEffect(() => {
    if (!ready || !user || !username) {
      setState(INITIAL_STATE)
      return
    }
    if (runId === 0) return

    const controller = new AbortController()
    const thisRun = runId
    activeRun.current = thisRun
    const mode = modeRef.current

    void syncGames(username, controller.signal, setState, mode)
      .then(async () => {
        if (controller.signal.aborted || activeRun.current !== thisRun) return
        await refreshPlayerData(queryClient, username)
        await refreshProfile()
      })
      .catch((error) => {
        if (controller.signal.aborted || activeRun.current !== thisRun) return
        setState((current) => ({
          ...current,
          phase: 'error',
          error: errorMessage(error),
          detail:
            mode === 'today'
              ? 'Today’s resync stopped — your saved games are kept. Try again when ready.'
              : mode === 'reanalyze'
                ? 'Reanalyze stopped — already rewritten games are kept. Run it again to continue.'
                : 'Sync stopped — your saved games are kept. Run Sync again to continue the library.',
        }))
      })

    return () => controller.abort()
  }, [queryClient, ready, refreshProfile, runId, user, username])

  const start = useCallback(() => {
    modeRef.current = 'full'
    setRunId((current) => current + 1)
  }, [])

  const resyncToday = useCallback(() => {
    modeRef.current = 'today'
    setRunId((current) => current + 1)
  }, [])

  const reanalyze = useCallback(() => {
    modeRef.current = 'reanalyze'
    setRunId((current) => current + 1)
  }, [])

  const value = useMemo(
    () => ({ ...state, start, retry: start, resyncToday, reanalyze }),
    [reanalyze, resyncToday, start, state],
  )

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
