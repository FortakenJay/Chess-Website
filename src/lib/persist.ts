import type { SupabaseClient } from '@supabase/supabase-js'
import { monthBounds, rollupGames } from './analysis/summarize'
import type { ClockStats, GameAnalysis, PhaseStats } from './analysis/types'
import type { Database, Json } from './supabase/database.types'

const CHUNK = 200

async function chunked<T>(
  rows: T[],
  write: (slice: T[]) => Promise<void>,
) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await write(rows.slice(i, i + CHUNK))
  }
}

export async function persistGames(
  client: SupabaseClient<Database>,
  analyses: GameAnalysis[],
) {
  if (analyses.length === 0) return

  const username = analyses[0]!.username
  const gameRows = analyses.map((game) => ({
    username: game.username,
    played_on: game.playedOn,
    opponent: game.opponent,
    color: game.color,
    result: game.result,
    blunder_count: game.blunderCount,
    mistake_count: game.mistakeCount,
    inaccuracy_count: game.inaccuracyCount,
    total_moves: game.totalMoves,
    phase_stats: game.phaseStats as unknown as Json,
    clock_stats: game.clockStats as unknown as Json,
    game_link: game.gameLink,
  }))

  const flaggedRows = analyses.flatMap((game) =>
    game.flagged.map((pos) => ({
      username: pos.username,
      played_on: pos.playedOn,
      opponent: pos.opponent,
      color: pos.color,
      move_number: pos.moveNumber,
      san: pos.san,
      loss: pos.loss,
      classification: pos.classification,
      phase: pos.phase,
      clock_left: pos.clockLeft,
      fen_before: pos.fenBefore,
      game_link: pos.gameLink,
      motif: pos.motif,
    })),
  )

  await chunked(gameRows, async (slice) => {
    const { error } = await client.from('games').upsert(slice, {
      onConflict: 'username,game_link',
    })
    if (error) throw error
  })

  await chunked(flaggedRows, async (slice) => {
    const { error } = await client.from('flagged_positions').upsert(slice, {
      onConflict: 'username,game_link,move_number',
    })
    if (error) throw error
  })

  const months = new Set(analyses.map((g) => monthBounds(g.playedOn).start))
  await recomputePeriods(client, username, [...months])

  const maxEnd = Math.max(...analyses.map((g) => g.endTime))
  const { data: existing } = await client
    .from('sync_state')
    .select('last_game_end_time')
    .eq('username', username)
    .maybeSingle()
  const last = Math.max(existing?.last_game_end_time ?? 0, maxEnd)
  const { error: syncError } = await client.from('sync_state').upsert({
    username,
    last_synced_at: new Date().toISOString(),
    last_game_end_time: last,
  })
  if (syncError) throw syncError
}

async function recomputePeriods(
  client: SupabaseClient<Database>,
  username: string,
  monthStarts: string[],
) {
  for (const start of monthStarts) {
    const bounds = monthBounds(start)
    const { data, error } = await client
      .from('games')
      .select('*')
      .eq('username', username)
      .gte('played_on', bounds.start)
      .lte('played_on', bounds.end)
    if (error) throw error
    const analyses: GameAnalysis[] = (data ?? []).map((row) => ({
      username: row.username,
      playedOn: row.played_on,
      opponent: row.opponent,
      color: row.color as GameAnalysis['color'],
      result: row.result as GameAnalysis['result'],
      blunderCount: row.blunder_count,
      mistakeCount: row.mistake_count,
      inaccuracyCount: row.inaccuracy_count,
      totalMoves: row.total_moves,
      phaseStats: row.phase_stats as unknown as PhaseStats,
      clockStats: row.clock_stats as unknown as ClockStats,
      gameLink: row.game_link,
      endTime: 0,
      flagged: [],
    }))
    const summary = rollupGames(analyses, bounds.start, bounds.end)
    const { error: upError } = await client.from('period_summary').upsert({
      username,
      period_start: summary.periodStart,
      period_end: summary.periodEnd,
      total_moves: summary.totalMoves,
      blunder_pct: summary.blunderPct,
      mistake_pct: summary.mistakePct,
      by_phase: summary.byPhase as unknown as Json,
      by_color: summary.byColor as unknown as Json,
      by_clock: summary.byClock as unknown as Json,
    })
    if (upError) throw upError
  }
}

export async function fetchAllRows<T>(
  run: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const page = 1000
  const all: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await run(from, from + page - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < page) break
    from += page
  }
  return all
}
