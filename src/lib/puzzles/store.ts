import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
import { resolveRatingBounds } from './weakness'
import type { PracticePuzzle, PuzzleFilters, PuzzleSource } from './types'

export function puzzleToRow(puzzle: PracticePuzzle) {
  return {
    id: puzzle.id,
    source: puzzle.source,
    rating: puzzle.rating,
    fen: puzzle.fen,
    solution: puzzle.solution as unknown as Json,
    themes: puzzle.themes,
    phase: puzzle.phase,
    motif: puzzle.motif,
    color: puzzle.color,
    url: puzzle.url,
  }
}

export function rowToPuzzle(row: Database['public']['Tables']['puzzles']['Row']): PracticePuzzle {
  const solution = Array.isArray(row.solution)
    ? (row.solution as string[])
    : typeof row.solution === 'string'
      ? (JSON.parse(row.solution) as string[])
      : []
  return {
    id: row.id,
    source: row.source as PuzzleSource,
    rating: row.rating,
    fen: row.fen,
    solution,
    themes: row.themes ?? [],
    phase: row.phase as PracticePuzzle['phase'],
    motif: row.motif as PracticePuzzle['motif'],
    color: row.color as PracticePuzzle['color'],
    url: row.url,
  }
}

export async function queryPuzzles(
  client: SupabaseClient<Database>,
  filters: PuzzleFilters,
  limit = 120,
  elo: number | null = null,
): Promise<PracticePuzzle[]> {
  const bounds = resolveRatingBounds(filters, elo)
  let query = client.from('puzzles').select('*').limit(limit)
  if (filters.phase) query = query.eq('phase', filters.phase)
  if (filters.motif) query = query.eq('motif', filters.motif)
  if (filters.color) query = query.eq('color', filters.color)
  if (filters.source) query = query.eq('source', filters.source)
  if (bounds.min != null) query = query.gte('rating', bounds.min)
  if (bounds.max != null) query = query.lte('rating', bounds.max)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(rowToPuzzle)
}

export async function countPuzzles(client: SupabaseClient<Database>) {
  const { count, error } = await client.from('puzzles').select('*', { count: 'exact', head: true })
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function upsertPuzzles(
  client: SupabaseClient<Database>,
  puzzles: PracticePuzzle[],
) {
  if (puzzles.length === 0) return
  const rows = puzzles.map(puzzleToRow)
  const chunk = 200
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk)
    const { error } = await client.from('puzzles').upsert(slice, { onConflict: 'id' })
    if (error) throw new Error(error.message)
  }
}
