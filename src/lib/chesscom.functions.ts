import { createServerFn } from '@tanstack/react-start'
import { fetchArchives, fetchMonthGames, fetchPlayer, fetchRecentGames } from './chesscom'
import { isLikelyUsername, normalizeUsername } from './username'

export const lookupPlayer = createServerFn({ method: 'GET' })
  .validator((data: { username: string }) => {
    if (!isLikelyUsername(data.username)) throw new Error('Invalid username')
    return { username: normalizeUsername(data.username) }
  })
  .handler(async ({ data }) => {
    const player = await fetchPlayer(data.username)
    return { username: normalizeUsername(player.username) }
  })

export const listArchives = createServerFn({ method: 'GET' })
  .validator((data: { username: string }) => ({
    username: normalizeUsername(data.username),
  }))
  .handler(async ({ data }) => fetchArchives(data.username))

export const listMonthGames = createServerFn({ method: 'GET' })
  .validator((data: { username: string; year: number; month: number; since?: number }) => data)
  .handler(async ({ data }) =>
    fetchMonthGames(data.username, data.year, data.month, data.since),
  )

export const listRecentGames = createServerFn({ method: 'GET' })
  .validator((data: { username: string; limit?: number }) => ({
    username: normalizeUsername(data.username),
    limit: Math.min(Math.max(data.limit ?? 5, 1), 10),
  }))
  .handler(async ({ data }) => fetchRecentGames(data.username, data.limit))
