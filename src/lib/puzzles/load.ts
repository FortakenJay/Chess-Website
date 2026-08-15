import { inTimeframe } from '@/lib/stats'
import { getBrowserClient } from '@/lib/supabase/browser'
import type { Motif, Phase, Side } from '@/lib/analysis/types'
import {
  bootstrapPuzzleCatalog,
  fetchChessComPuzzles,
  fetchLichessPuzzleBatch,
  getPuzzleCatalogStats,
  savePuzzles,
} from './functions'
import {
  filterPuzzles,
  puzzleCacheKey,
  readPuzzleCache,
  writePuzzleCache,
} from './cache'
import { countPuzzles, queryPuzzles } from './store'
import type { PracticePuzzle, PuzzleFilters } from './types'

const DB_SATISFIED = 24

export type LoadPuzzlesResult = {
  puzzles: PracticePuzzle[]
  applied: PuzzleFilters
  relaxed: boolean
  catalogTotal: number
}

async function loadStaticPack(): Promise<PracticePuzzle[]> {
  try {
    const response = await fetch('/data/lichess-puzzles.json')
    if (!response.ok) return []
    const data = (await response.json()) as { puzzles?: PracticePuzzle[] }
    return Array.isArray(data.puzzles) ? data.puzzles : []
  } catch {
    return []
  }
}

async function persistCatalog(puzzles: PracticePuzzle[]) {
  if (puzzles.length === 0) return
  await savePuzzles({ data: { puzzles } })
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

function sortByEloFit(puzzles: PracticePuzzle[], elo: number | null) {
  if (elo == null) return puzzles
  return [...puzzles].sort((a, b) => {
    const da = a.rating == null ? 9999 : Math.abs(a.rating - elo)
    const db = b.rating == null ? 9999 : Math.abs(b.rating - elo)
    return da - db
  })
}

async function fetchRemote(filters: PuzzleFilters): Promise<PracticePuzzle[]> {
  const fetched: PracticePuzzle[] = []
  const wantLichess = !filters.source || filters.source === 'lichess'
  const wantChesscom = !filters.source || filters.source === 'chesscom'

  if (wantLichess) {
    try {
      const batch = await fetchLichessPuzzleBatch({
        data: {
          phase: filters.phase,
          motif: filters.motif,
          nb: 50,
        },
      })
      fetched.push(...batch)
    } catch {
      // seed remains
    }
  }

  if (wantChesscom) {
    try {
      const batch = await fetchChessComPuzzles({
        data: { randomCount: filters.source === 'chesscom' ? 24 : 8 },
      })
      fetched.push(...batch)
    } catch {
      // optional
    }
  }

  return fetched
}

function relaxSteps(filters: PuzzleFilters): PuzzleFilters[] {
  const steps: PuzzleFilters[] = [filters]
  if (filters.motif) steps.push({ ...filters, motif: '' })
  if (filters.color) steps.push({ ...filters, motif: '', color: '' })
  if (filters.ratingBand !== 'any' || filters.ratingMin !== '' || filters.ratingMax !== '') {
    steps.push({
      ...filters,
      motif: '',
      color: '',
      ratingBand: 'any',
      ratingMin: '',
      ratingMax: '',
    })
  }
  if (filters.phase) {
    steps.push({
      ...filters,
      motif: '',
      color: '',
      phase: '',
      ratingBand: 'any',
      ratingMin: '',
      ratingMax: '',
    })
  }
  if (filters.source) {
    steps.push({
      phase: '',
      motif: '',
      color: '',
      source: '',
      ratingBand: 'any',
      ratingMin: '',
      ratingMax: '',
      focus: '',
    })
  }
  const seen = new Set<string>()
  return steps.filter((step) => {
    const key = puzzleCacheKey(step)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function loadPracticePuzzles(
  filters: PuzzleFilters,
  options: { force?: boolean; elo?: number | null } = {},
): Promise<LoadPuzzlesResult> {
  const elo = options.elo ?? null
  const supabase = getBrowserClient()
  let catalogTotal = 0

  let dbReachable = true
  let fromDb: PracticePuzzle[] = []
  try {
    catalogTotal = await countPuzzles(supabase)
    fromDb = await queryPuzzles(supabase, filters, 160, elo)
  } catch {
    dbReachable = false
    fromDb = []
  }

  if (dbReachable && !options.force && fromDb.length >= DB_SATISFIED) {
    const key = puzzleCacheKey(filters, elo)
    await writePuzzleCache(key, fromDb)
    return {
      puzzles: shuffle(sortByEloFit(fromDb, elo)),
      applied: filters,
      relaxed: false,
      catalogTotal,
    }
  }

  if (!dbReachable && !options.force) {
    const cached = await readPuzzleCache(puzzleCacheKey(filters, elo))
    if (cached && cached.length > 0) {
      const filtered = filterPuzzles(cached, filters, elo)
      if (filtered.length > 0) {
        return {
          puzzles: shuffle(sortByEloFit(filtered, elo)),
          applied: filters,
          relaxed: false,
          catalogTotal,
        }
      }
    }
  }

  const [staticPack, fetched] = await Promise.all([loadStaticPack(), fetchRemote(filters)])

  const pool = new Map<string, PracticePuzzle>()
  for (const puzzle of [...fromDb, ...staticPack, ...fetched]) {
    pool.set(puzzle.id, puzzle)
  }
  const all = [...pool.values()]

  if (dbReachable && all.length > 0) {
    try {
      await persistCatalog(all)
      catalogTotal = await countPuzzles(supabase)
    } catch {
      // best-effort
    }
  }

  for (const [index, step] of relaxSteps(filters).entries()) {
    const filtered = filterPuzzles(all, step, elo)
    if (filtered.length === 0) continue
    await writePuzzleCache(puzzleCacheKey(step, elo), filtered)
    return {
      puzzles: shuffle(sortByEloFit(filtered, elo)),
      applied: step,
      relaxed: index > 0,
      catalogTotal,
    }
  }

  if (!dbReachable) {
    const cached = await readPuzzleCache(puzzleCacheKey(filters, elo))
    if (cached && cached.length > 0) {
      return {
        puzzles: shuffle(sortByEloFit(cached, elo)),
        applied: filters,
        relaxed: true,
        catalogTotal,
      }
    }
  }

  return { puzzles: [], applied: filters, relaxed: false, catalogTotal }
}

export type ExpandCatalogResult = {
  saved: number
  lichessOk: number
  chesscomOk: number
  catalogTotal: number
}

export async function expandPuzzleCatalog(rounds = 2): Promise<ExpandCatalogResult> {
  const result = await bootstrapPuzzleCatalog({ data: { rounds } })
  if (
    result &&
    typeof result === 'object' &&
    'catalogTotal' in result &&
    typeof (result as ExpandCatalogResult).catalogTotal === 'number'
  ) {
    return result as ExpandCatalogResult
  }
  return { saved: 0, lichessOk: 0, chesscomOk: 0, catalogTotal: 0 }
}


export async function readCatalogStats() {
  return getPuzzleCatalogStats()
}

export function monthGames(games: Array<{ played_on: string }>) {
  return games.filter((game) => inTimeframe(game.played_on, 'month'))
}

export type { PuzzleFilters, PracticePuzzle, Motif, Phase, Side }
