import {
  canUseIdb,
  idbRequest,
  LEAK_CACHE_SCHEMA_VERSION,
  openIdb,
} from '@/lib/idbCache'
import { resolveRatingBounds } from './weakness'
import type { PracticePuzzle, PuzzleFilters } from './types'

const DB_NAME = 'leak-puzzle-cache'
const STORE = 'puzzles'
const DB_VERSION = 1

type CacheEntry = {
  version: number
  key: string
  savedAt: string
  puzzles: PracticePuzzle[]
}

export function puzzleCacheKey(filters: PuzzleFilters, elo: number | null = null) {
  const bounds = resolveRatingBounds(filters, elo)
  return [
    filters.phase || 'any-phase',
    filters.motif || 'any-motif',
    filters.color || 'any-color',
    filters.source || 'any-source',
    filters.ratingBand || 'any-band',
    bounds.min ?? 'min',
    bounds.max ?? 'max',
    filters.focus || 'no-focus',
  ].join('|')
}

export function filterPuzzles(
  puzzles: PracticePuzzle[],
  filters: PuzzleFilters,
  elo: number | null = null,
) {
  const bounds = resolveRatingBounds(filters, elo)
  return puzzles.filter((puzzle) => {
    if (filters.phase && puzzle.phase !== filters.phase) return false
    if (filters.motif && puzzle.motif !== filters.motif) return false
    if (filters.color && puzzle.color !== filters.color) return false
    if (filters.source && puzzle.source !== filters.source) return false
    if (bounds.min != null || bounds.max != null) {
      if (puzzle.rating == null) return false
      if (bounds.min != null && puzzle.rating < bounds.min) return false
      if (bounds.max != null && puzzle.rating > bounds.max) return false
    }
    return true
  })
}

export async function readPuzzleCache(key: string): Promise<PracticePuzzle[] | null> {
  if (!canUseIdb()) return null
  try {
    const db = await openIdb(DB_NAME, STORE, DB_VERSION)
    try {
      const tx = db.transaction(STORE, 'readonly')
      const entry = await idbRequest<CacheEntry | undefined>(tx.objectStore(STORE).get(key))
      if (!entry || entry.version !== LEAK_CACHE_SCHEMA_VERSION) return null
      return entry.puzzles
    } finally {
      db.close()
    }
  } catch {
    return null
  }
}

export async function writePuzzleCache(key: string, puzzles: PracticePuzzle[]): Promise<void> {
  if (!canUseIdb()) return
  try {
    const db = await openIdb(DB_NAME, STORE, DB_VERSION)
    try {
      const tx = db.transaction(STORE, 'readwrite')
      const existing = await idbRequest<CacheEntry | undefined>(tx.objectStore(STORE).get(key))
      const merged = new Map<string, PracticePuzzle>()
      if (existing?.version === LEAK_CACHE_SCHEMA_VERSION) {
        for (const puzzle of existing.puzzles) merged.set(puzzle.id, puzzle)
      }
      for (const puzzle of puzzles) merged.set(puzzle.id, puzzle)
      const entry: CacheEntry = {
        version: LEAK_CACHE_SCHEMA_VERSION,
        key,
        savedAt: new Date().toISOString(),
        puzzles: [...merged.values()],
      }
      await idbRequest(tx.objectStore(STORE).put(entry, key))
    } finally {
      db.close()
    }
  } catch {
    // ignore quota errors
  }
}

export async function readAllPuzzleCaches(): Promise<PracticePuzzle[]> {
  if (!canUseIdb()) return []
  try {
    const db = await openIdb(DB_NAME, STORE, DB_VERSION)
    try {
      const tx = db.transaction(STORE, 'readonly')
      const entries = await idbRequest<CacheEntry[]>(tx.objectStore(STORE).getAll())
      const merged = new Map<string, PracticePuzzle>()
      for (const entry of entries) {
        if (entry.version !== LEAK_CACHE_SCHEMA_VERSION) continue
        for (const puzzle of entry.puzzles) merged.set(puzzle.id, puzzle)
      }
      return [...merged.values()]
    } finally {
      db.close()
    }
  } catch {
    return []
  }
}
