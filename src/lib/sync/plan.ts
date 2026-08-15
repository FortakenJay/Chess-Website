import type { ArchiveMonth } from '@/lib/chesscom'

export const DOWNLOAD_BATCH_MONTHS = 2
export const SAVE_BATCH_GAMES = 10
export const DEFAULT_MOVETIME = 80

/** Only keep / sync Chess.com games from this rolling window. */
export const GAME_RETENTION_YEARS = 2

export type SyncHistoryMode = 'full' | 'incremental'

/** Unix seconds: games with endTime before this are out of retention. */
export function gameRetentionCutoffSeconds(now = Date.now()): number {
  const d = new Date(now)
  d.setUTCFullYear(d.getUTCFullYear() - GAME_RETENTION_YEARS)
  return Math.floor(d.getTime() / 1000)
}

/** Drop archive months that end before the retention cutoff. */
export function filterArchivesByRetention(
  archives: ArchiveMonth[],
  cutoffSeconds = gameRetentionCutoffSeconds(),
): ArchiveMonth[] {
  return archives.filter((month) => {
    // Inclusive: keep the month if any day in it could be >= cutoff.
    const monthEnd = Date.UTC(month.year, month.month, 0, 23, 59, 59) / 1000
    return monthEnd >= cutoffSeconds
  })
}

/**
 * Newest months first.
 * - full: every archive month within the retention window (browser library backfill)
 * - incremental: only months that can contain games newer than `since`
 * Always respects GAME_RETENTION_YEARS (no games older than that window).
 */
export function monthsToScan(
  archives: ArchiveMonth[],
  sinceEndTime: number | null | undefined,
  options: {
    maxMonthsWithoutSince?: number
    history?: SyncHistoryMode
    retentionCutoffSeconds?: number
  } = {},
): ArchiveMonth[] {
  const cutoff = options.retentionCutoffSeconds ?? gameRetentionCutoffSeconds()
  const retained = filterArchivesByRetention(archives, cutoff)
  const sorted = [...retained].sort((a, b) => b.year - a.year || b.month - a.month)
  const history = options.history ?? 'full'

  // Never sync older than retention, even on full backfill.
  const sinceFloor = Math.max(sinceEndTime ?? 0, cutoff)

  if (history === 'full') {
    // Full history within retention only.
    return sorted
  }

  const filtered = sinceFloor
    ? sorted.filter((month) => {
        const stamp = Date.UTC(month.year, month.month - 1, 1) / 1000
        return stamp + 32 * 86400 >= sinceFloor
      })
    : sorted

  if (!(sinceEndTime ?? 0) && options.maxMonthsWithoutSince != null) {
    return filtered.slice(0, options.maxMonthsWithoutSince)
  }
  return filtered
}

export function chunkMonths<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size))
  }
  return batches
}
