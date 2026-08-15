import type { RawGame } from '@/lib/analysis/analyzeGame'
import type { GameAnalysis } from '@/lib/analysis/types'
import type { ArchiveMonth } from '@/lib/chesscom'
import {
  chunkMonths,
  DEFAULT_MOVETIME,
  DOWNLOAD_BATCH_MONTHS,
  gameRetentionCutoffSeconds,
  monthsToScan,
  SAVE_BATCH_GAMES,
  type SyncHistoryMode,
} from './plan'

export type SyncProgress =
  | { type: 'checking' }
  | { type: 'scanning'; months: number }
  | {
      type: 'month_batch'
      batch: number
      batchTotal: number
      monthsDone: number
      monthsTotal: number
      libraryCount: number
      chesscomSeen: number
    }
  | {
      type: 'analyzing'
      phase: 'engine' | 'game'
      gamesDone: number
      gamesTotal: number
      discovered: number
      ply: number
      plyTotal: number
      monthsDone: number
      monthsTotal: number
      libraryCount: number
      chesscomSeen: number
    }
  | {
      type: 'saved'
      saved: number
      flagged: number
      libraryCount: number
      chesscomSeen: number
    }
  | {
      type: 'complete'
      saved: number
      flagged: number
      discovered: number
      skipped: number
      libraryCount: number
      chesscomSeen: number
      monthsTotal: number
      historyComplete: boolean
    }

export type SyncResult = {
  saved: number
  flagged: number
  discovered: number
  skipped: number
  maxEndTime: number
  libraryCount: number
  chesscomSeen: number
  monthsTotal: number
  historyComplete: boolean
}

export type RunUserSyncDeps = {
  listArchives: (username: string) => Promise<ArchiveMonth[]>
  listMonthGames: (
    username: string,
    year: number,
    month: number,
    since?: number,
  ) => Promise<RawGame[]>
  getSavedGameLinks: (username: string) => Promise<Set<string>>
  getSinceEndTime: (username: string) => Promise<number>
  analyzeBatch: (
    games: RawGame[],
    username: string,
    options: {
      movetime: number
      signal?: AbortSignal
      onProgress?: (info: {
        phase: 'engine' | 'game'
        gamesDone: number
        gamesTotal: number
        ply: number
        plyTotal: number
      }) => void
      onGame?: (analysis: GameAnalysis) => void | Promise<void>
    },
  ) => Promise<void>
  persistBatch: (analyses: GameAnalysis[]) => Promise<void>
  markSync: (username: string, maxEndTime: number) => Promise<void>
  /** Drop DB rows older than retention (usually once per sync). */
  purgeExpired?: () => Promise<void>
  signal?: AbortSignal
  shouldStop?: () => boolean
  onProgress?: (event: SyncProgress) => void
  monthBatchSize?: number
  saveBatchSize?: number
  movetime?: number
  /** When no sync cursor exists, only scan this many newest months (cron). */
  maxMonthsWithoutSince?: number
  /**
   * full = walk Chess.com months within the retention window and import any game not already saved
   *   (browser library backfill — ignores since for filtering, still respects retention)
   * incremental = only games newer than since (cron catch-up)
   * reanalyze = walk the same months as full; use shouldAnalyze to rewrite saved games
   */
  history?: SyncHistoryMode
  /** Override which downloaded games go through the engine. Default: not already saved. */
  shouldAnalyze?: (game: RawGame, known: Set<string>) => boolean
}

function aborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
}

function stopped(deps: RunUserSyncDeps) {
  aborted(deps.signal)
  if (deps.shouldStop?.()) throw new DOMException('Sync budget exhausted', 'AbortError')
}

export async function runUserSync(
  username: string,
  deps: RunUserSyncDeps,
): Promise<SyncResult> {
  const monthBatchSize = deps.monthBatchSize ?? DOWNLOAD_BATCH_MONTHS
  const saveBatchSize = deps.saveBatchSize ?? SAVE_BATCH_GAMES
  const movetime = deps.movetime ?? DEFAULT_MOVETIME
  const history = deps.history ?? 'full'
  const retentionCutoff = gameRetentionCutoffSeconds()

  deps.onProgress?.({ type: 'checking' })

  try {
    await deps.purgeExpired?.()
  } catch {
    // Best-effort retention cleanup — sync should still proceed.
  }

  const [savedLinks, since, archives] = await Promise.all([
    deps.getSavedGameLinks(username),
    deps.getSinceEndTime(username),
    deps.listArchives(username),
  ])
  stopped(deps)

  const months = monthsToScan(archives, since, {
    maxMonthsWithoutSince: deps.maxMonthsWithoutSince,
    history,
    retentionCutoffSeconds: retentionCutoff,
  })
  const monthsTotal = months.length
  deps.onProgress?.({ type: 'scanning', months: monthsTotal })

  let saved = 0
  let flagged = 0
  let discovered = 0
  let analyzed = 0
  let chesscomSeen = 0
  let monthsDone = 0
  let maxEndTime = since
  const pending: GameAnalysis[] = []
  const known = new Set(savedLinks)
  // Incremental catch-up uses since; never go older than retention.
  // Chess.com month fetch uses exclusive `>`; pass cutoff-1 so endTime >= cutoff is kept.
  const floor =
    history === 'incremental' ? Math.max(since || 0, retentionCutoff) : retentionCutoff
  const sinceFilter = floor > 0 ? floor - 1 : undefined

  async function flush() {
    if (pending.length === 0) return
    const batch = pending.splice(0, pending.length)
    await deps.persistBatch(batch)
    saved += batch.length
    deps.onProgress?.({
      type: 'saved',
      saved,
      flagged,
      libraryCount: known.size,
      chesscomSeen,
    })
  }

  let historyComplete = false

  try {
    const batches = chunkMonths(months, monthBatchSize)
    for (let i = 0; i < batches.length; i++) {
      stopped(deps)
      const monthBatch = batches[i]!
      deps.onProgress?.({
        type: 'month_batch',
        batch: i + 1,
        batchTotal: batches.length,
        monthsDone,
        monthsTotal,
        libraryCount: known.size,
        chesscomSeen,
      })

      const responses = await Promise.all(
        monthBatch.map((month) =>
          deps.listMonthGames(username, month.year, month.month, sinceFilter),
        ),
      )
      stopped(deps)

      monthsDone += monthBatch.length
      const downloaded = responses
        .flat()
        .filter((game) => game.endTime >= retentionCutoff)
        .sort((a, b) => b.endTime - a.endTime)
      chesscomSeen += downloaded.length
      for (const game of downloaded) maxEndTime = Math.max(maxEndTime, game.endTime)
      const games = downloaded.filter((game) =>
        deps.shouldAnalyze
          ? deps.shouldAnalyze(game, known)
          : history === 'reanalyze' || !known.has(game.url),
      )
      discovered += games.length

      deps.onProgress?.({
        type: 'month_batch',
        batch: i + 1,
        batchTotal: batches.length,
        monthsDone,
        monthsTotal,
        libraryCount: known.size,
        chesscomSeen,
      })

      if (games.length === 0) continue

      await deps.analyzeBatch(games, username, {
        movetime,
        signal: deps.signal,
        onProgress: (info) => {
          deps.onProgress?.({
            type: 'analyzing',
            phase: info.phase,
            gamesDone: info.gamesDone,
            gamesTotal: info.gamesTotal,
            discovered,
            ply: info.ply,
            plyTotal: info.plyTotal,
            monthsDone,
            monthsTotal,
            libraryCount: known.size,
            chesscomSeen,
          })
        },
        onGame: async (analysis) => {
          pending.push(analysis)
          known.add(analysis.gameLink)
          flagged += analysis.flagged.length
          if (pending.length >= saveBatchSize) await flush()
        },
      })
      analyzed += games.length
      deps.onProgress?.({
        type: 'analyzing',
        phase: 'game',
        gamesDone: analyzed,
        gamesTotal: discovered,
        discovered,
        ply: 0,
        plyTotal: 0,
        monthsDone,
        monthsTotal,
        libraryCount: known.size,
        chesscomSeen,
      })
      await flush()
    }

    stopped(deps)
    await flush()
    await deps.markSync(username, maxEndTime)
    historyComplete =
      (history === 'full' || history === 'reanalyze') && monthsDone >= monthsTotal
  } catch (error) {
    await flush()
    if (saved > 0 || maxEndTime > since) {
      try {
        await deps.markSync(username, maxEndTime)
      } catch {
        // Prefer surfacing the original abort/error.
      }
    }
    throw error
  }

  const result: SyncResult = {
    saved,
    flagged,
    discovered,
    skipped: savedLinks.size,
    maxEndTime,
    libraryCount: known.size,
    chesscomSeen,
    monthsTotal,
    historyComplete,
  }
  deps.onProgress?.({
    type: 'complete',
    saved,
    flagged,
    discovered,
    skipped: savedLinks.size,
    libraryCount: known.size,
    chesscomSeen,
    monthsTotal,
    historyComplete,
  })
  return result
}
