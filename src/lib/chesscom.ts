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
  return (data.games ?? [])
    .filter((game) => (game.rules ?? 'chess') === 'chess' && game.pgn)
    .filter((game) => (sinceEndTime ? game.end_time > sinceEndTime : true))
    .map((game) => ({
      pgn: game.pgn!,
      url: game.url,
      endTime: game.end_time,
      white: game.white.username,
      black: game.black.username,
      whiteResult: game.white.result,
      blackResult: game.black.result,
      whiteRating: game.white.rating,
      blackRating: game.black.rating,
      timeClass: game.time_class,
    }))
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
