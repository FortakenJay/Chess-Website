import { normalizeUsername } from './username'

export type ChessComGame = {
  pgn: string
  url: string
  endTime: number
  white: string
  black: string
  whiteResult: string
  blackResult: string
  whiteRating?: number
  blackRating?: number
  timeClass?: string
}

export type ArchiveMonth = { year: number; month: number }

export type ChessComRatings = {
  username: string
  bullet: number | null
  blitz: number | null
  rapid: number | null
  daily: number | null
  /** Best available rating for puzzle matching (prefers blitz → rapid → bullet → daily). */
  primary: number | null
  primaryClass: 'bullet' | 'blitz' | 'rapid' | 'daily' | null
}

const DEFAULT_UA = 'leak/1.0 (personal chess analysis)'

function userAgent() {
  return process.env.CHESSCOM_USER_AGENT || DEFAULT_UA
}

async function chessComGet<T>(url: string): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent(),
        Accept: 'application/json',
      },
    })
    if (response.status === 429) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
      continue
    }
    if (response.status === 404) {
      throw new Error('Chess.com player not found')
    }
    if (!response.ok) {
      lastError = new Error(`Chess.com ${response.status} for ${url}`)
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
      continue
    }
    return (await response.json()) as T
  }
  throw lastError ?? new Error(`Chess.com request failed for ${url}`)
}

export async function fetchPlayer(username: string) {
  const name = normalizeUsername(username)
  return chessComGet<{ username: string; url: string }>(
    `https://api.chess.com/pub/player/${encodeURIComponent(name)}`,
  )
}

type StatsPayload = {
  chess_bullet?: { last?: { rating?: number }; best?: { rating?: number } }
  chess_blitz?: { last?: { rating?: number }; best?: { rating?: number } }
  chess_rapid?: { last?: { rating?: number }; best?: { rating?: number } }
  chess_daily?: { last?: { rating?: number }; best?: { rating?: number } }
}

function lastRating(bucket?: { last?: { rating?: number }; best?: { rating?: number } }) {
  return bucket?.last?.rating ?? bucket?.best?.rating ?? null
}

export async function fetchPlayerRatings(username: string): Promise<ChessComRatings> {
  const name = normalizeUsername(username)
  const data = await chessComGet<StatsPayload>(
    `https://api.chess.com/pub/player/${encodeURIComponent(name)}/stats`,
  )
  const bullet = lastRating(data.chess_bullet)
  const blitz = lastRating(data.chess_blitz)
  const rapid = lastRating(data.chess_rapid)
  const daily = lastRating(data.chess_daily)

  let primary: number | null = null
  let primaryClass: ChessComRatings['primaryClass'] = null
  for (const [key, value] of [
    ['blitz', blitz],
    ['rapid', rapid],
    ['bullet', bullet],
    ['daily', daily],
  ] as const) {
    if (value != null) {
      primary = value
      primaryClass = key
      break
    }
  }

  return { username: name, bullet, blitz, rapid, daily, primary, primaryClass }
}

export async function fetchArchives(username: string): Promise<ArchiveMonth[]> {
  const name = normalizeUsername(username)
  const data = await chessComGet<{ archives: string[] }>(
    `https://api.chess.com/pub/player/${encodeURIComponent(name)}/games/archives`,
  )
  return (data.archives ?? []).map((url) => {
    const parts = url.split('/')
    const month = Number(parts.at(-1))
    const year = Number(parts.at(-2))
    return { year, month }
  })
}

type ChessComMonthResponse = {
  games: Array<{
    url: string
    pgn?: string
    end_time: number
    rules?: string
    time_class?: string
    white: { username: string; result: string; rating?: number }
    black: { username: string; result: string; rating?: number }
  }>
}

export async function fetchMonthGames(
  username: string,
  year: number,
  month: number,
  sinceEndTime?: number,
): Promise<ChessComGame[]> {
  const name = normalizeUsername(username)
  const mm = String(month).padStart(2, '0')
  const data = await chessComGet<ChessComMonthResponse>(
    `https://api.chess.com/pub/player/${encodeURIComponent(name)}/games/${year}/${mm}`,
  )
  return (data.games ?? []).flatMap((game) => {
    if ((game.rules ?? 'chess') !== 'chess' || !game.pgn) return []
    if (sinceEndTime && !(game.end_time > sinceEndTime)) return []
    return [
      {
        pgn: game.pgn,
        url: game.url,
        endTime: game.end_time,
        white: game.white.username,
        black: game.black.username,
        whiteResult: game.white.result,
        blackResult: game.black.result,
        whiteRating: game.white.rating,
        blackRating: game.black.rating,
        timeClass: game.time_class,
      },
    ]
  })
}

export async function fetchRecentGames(
  username: string,
  limit = 5,
): Promise<ChessComGame[]> {
  const archives = await fetchArchives(username)
  const months = [...archives].sort((a, b) => b.year - a.year || b.month - a.month)
  const collected: ChessComGame[] = []
  for (const month of months) {
    const batch = await fetchMonthGames(username, month.year, month.month)
    collected.push(...batch)
    collected.sort((a, b) => b.endTime - a.endTime)
    if (collected.length >= limit) break
  }
  return collected.slice(0, limit)
}

/** Walk newest archives until the Chess.com game URL is found. */
export async function fetchGameByUrl(
  username: string,
  gameUrl: string,
  maxMonths = 24,
): Promise<ChessComGame | null> {
  const target = normalizeGameUrl(gameUrl)
  if (!target) return null
  const archives = await fetchArchives(username)
  const months = [...archives].sort((a, b) => b.year - a.year || b.month - a.month)
  for (const month of months.slice(0, maxMonths)) {
    const batch = await fetchMonthGames(username, month.year, month.month)
    const hit = batch.find((game) => normalizeGameUrl(game.url) === target)
    if (hit) return hit
  }
  return null
}

export function normalizeGameUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim())
    if (!parsed.hostname.includes('chess.com')) return null
    // Keep path only — live/daily ids are unique enough.
    return parsed.pathname.replace(/\/+$/, '').toLowerCase()
  } catch {
    const match = /chess\.com(\/game\/(?:live|daily)\/\d+)/i.exec(url)
    return match ? match[1]!.toLowerCase() : null
  }
}

/** Build a ChessComGame from pasted PGN for free review (no Chess.com fetch). */
export function gameFromPgn(pgn: string, username: string): ChessComGame | null {
  const trimmed = pgn.trim()
  if (!trimmed || !trimmed.includes('[')) return null
  try {
    // Lazy parse headers without pulling chess.js into this module's top-level for SSR size —
    // callers already use chess.js elsewhere; keep simple regex headers here.
    const header = (key: string) => {
      const re = new RegExp(`\\[${key}\\s+"([^"]*)"\\]`, 'i')
      return re.exec(trimmed)?.[1] ?? ''
    }
    const white = header('White')
    const black = header('Black')
    const user = username.toLowerCase()
    if (white.toLowerCase() !== user && black.toLowerCase() !== user) {
      // Still allow — treat as white username override for analysis identity
    }
    const link = header('Link') || header('Site') || `pgn://${Date.now()}`
    const date = header('UTCDate') || header('Date')
    let endTime = Math.floor(Date.now() / 1000)
    if (date) {
      const iso = date.replace(/\./g, '-')
      const ms = Date.parse(iso)
      if (!Number.isNaN(ms)) endTime = Math.floor(ms / 1000)
    }
    const result = header('Result')
    const whiteResult =
      result === '1-0' ? 'win' : result === '0-1' ? 'checkmated' : result === '1/2-1/2' ? 'agreed' : 'unknown'
    const blackResult =
      result === '0-1' ? 'win' : result === '1-0' ? 'checkmated' : result === '1/2-1/2' ? 'agreed' : 'unknown'
    const whiteElo = Number(header('WhiteElo')) || undefined
    const blackElo = Number(header('BlackElo')) || undefined
    return {
      pgn: trimmed,
      url: link.startsWith('http') ? link : `pgn://${encodeURIComponent(link)}-${endTime}`,
      endTime,
      white: white || 'white',
      black: black || 'black',
      whiteResult,
      blackResult,
      whiteRating: whiteElo,
      blackRating: blackElo,
      timeClass: header('TimeControl') || undefined,
    }
  } catch {
    return null
  }
}
