import { createServerFn } from '@tanstack/react-start'
import type { Motif, Phase } from '@/lib/analysis/types'
import { getServiceClient } from '@/lib/supabase/admin'
import { normalizeChessComPuzzle, normalizeLichessPuzzle } from './normalize'
import { countPuzzles, upsertPuzzles } from './store'
import { LICHESS_BATCH_ANGLES, lichessAngle } from './themes'
import type { PracticePuzzle } from './types'

const UA = process.env.CHESSCOM_USER_AGENT || 'leak/1.0 (personal chess analysis)'

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  let last: Error | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'User-Agent': UA,
        ...(init?.headers ?? {}),
      },
    })
    if (response.status === 429) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
      continue
    }
    if (!response.ok) {
      last = new Error(`${response.status} for ${url}`)
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
      continue
    }
    return (await response.json()) as T
  }
  throw last ?? new Error(`Request failed for ${url}`)
}

type LichessBatchRow = {
  game: { id: string; pgn?: string }
  puzzle: {
    id: string
    rating: number
    solution: string[]
    themes: string[]
    initialPly?: number
  }
}

async function fetchLichessAngle(angle: string, nb: number) {
  const payload = await getJson<{ puzzles: LichessBatchRow[] }>(
    `https://lichess.org/api/puzzle/batch/${encodeURIComponent(angle)}?nb=${nb}`,
  )
  const puzzles: PracticePuzzle[] = []
  for (const row of payload.puzzles ?? []) {
    const normalized = normalizeLichessPuzzle(row)
    if (normalized) puzzles.push(normalized)
  }
  return puzzles
}

export const fetchLichessPuzzleBatch = createServerFn({ method: 'GET' })
  .validator((data: { phase?: Phase | ''; motif?: Motif | ''; nb?: number }) => ({
    phase: data.phase ?? '',
    motif: data.motif ?? '',
    nb: Math.min(Math.max(data.nb ?? 30, 1), 50),
  }))
  .handler(async ({ data }) => fetchLichessAngle(lichessAngle(data), data.nb))

export const fetchChessComPuzzles = createServerFn({ method: 'GET' })
  .validator((data: { randomCount?: number } = {}) => ({
    randomCount: Math.min(Math.max(data.randomCount ?? 8, 0), 40),
  }))
  .handler(async ({ data }) => {
    const puzzles: PracticePuzzle[] = []
    try {
      const daily = await getJson<{
        title: string
        url: string
        fen: string
        pgn: string
        publish_time?: number
      }>('https://api.chess.com/pub/puzzle')
      const dailyNorm = normalizeChessComPuzzle(daily)
      if (dailyNorm) puzzles.push(dailyNorm)
    } catch {
      // daily optional
    }

    for (let i = 0; i < data.randomCount; i++) {
      try {
        if (i > 0) await new Promise((r) => setTimeout(r, 150))
        const random = await getJson<{
          title: string
          url: string
          fen: string
          pgn: string
          publish_time?: number
        }>('https://api.chess.com/pub/puzzle/random')
        const normalized = normalizeChessComPuzzle(random)
        if (normalized && !puzzles.some((p) => p.id === normalized.id)) {
          puzzles.push(normalized)
        }
      } catch {
        break
      }
    }
    return puzzles
  })

export const savePuzzles = createServerFn({ method: 'POST' })
  .validator((data: { puzzles: PracticePuzzle[] }) => ({
    puzzles: Array.isArray(data.puzzles) ? data.puzzles.slice(0, 500) : [],
  }))
  .handler(async ({ data }) => {
    if (data.puzzles.length === 0) return { saved: 0 }
    const supabase = getServiceClient()
    await upsertPuzzles(supabase, data.puzzles)
    return { saved: data.puzzles.length }
  })

/**
 * Pull a large Lichess + Chess.com catalog into Supabase.
 * Chess.com has no full public dump — we sample daily/random heavily.
 * Lichess full dump: `npm run puzzles:import-full` (database.lichess.org CSV).
 */
export const bootstrapPuzzleCatalog = createServerFn({ method: 'POST' })
  .validator((data: { rounds?: number } = {}) => ({
    rounds: Math.min(Math.max(data.rounds ?? 2, 1), 4),
  }))
  .handler(async ({ data }) => {
    const merged = new Map<string, PracticePuzzle>()
    const angles = [...LICHESS_BATCH_ANGLES]
    let lichessOk = 0
    let chesscomOk = 0

    for (let round = 0; round < data.rounds; round++) {
      for (const angle of angles) {
        try {
          const batch = await fetchLichessAngle(angle, 50)
          for (const puzzle of batch) {
            if (!merged.has(puzzle.id)) {
              merged.set(puzzle.id, puzzle)
              lichessOk += 1
            }
          }
        } catch {
          // rate limits — keep going
        }
        await new Promise((r) => setTimeout(r, 700))
      }
    }

    try {
      const chesscom = await getJson<{
        title: string
        url: string
        fen: string
        pgn: string
        publish_time?: number
      }>('https://api.chess.com/pub/puzzle')
      const daily = normalizeChessComPuzzle(chesscom)
      if (daily) {
        merged.set(daily.id, daily)
        chesscomOk += 1
      }
    } catch {
      /* ignore */
    }

    for (let i = 0; i < 30; i++) {
      try {
        await new Promise((r) => setTimeout(r, 120))
        const random = await getJson<{
          title: string
          url: string
          fen: string
          pgn: string
          publish_time?: number
        }>('https://api.chess.com/pub/puzzle/random')
        const normalized = normalizeChessComPuzzle(random)
        if (normalized && !merged.has(normalized.id)) {
          merged.set(normalized.id, normalized)
          chesscomOk += 1
        }
      } catch {
        break
      }
    }

    const puzzles = [...merged.values()]
    if (puzzles.length === 0) {
      return { saved: 0, lichessOk: 0, chesscomOk: 0, catalogTotal: 0 }
    }

    const admin = getServiceClient()
    await upsertPuzzles(admin, puzzles)
    const catalogTotal = await countPuzzles(admin)
    return { saved: puzzles.length, lichessOk, chesscomOk, catalogTotal }
  })

export const getPuzzleCatalogStats = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const supabase = getServiceClient()
    const total = await countPuzzles(supabase)
    return { total }
  } catch {
    return { total: 0 }
  }
})
