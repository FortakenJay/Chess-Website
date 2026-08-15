import { useQuery, type QueryClient } from '@tanstack/react-query'
import { listArchives, listMonthGames, listRecentGames } from '@/lib/chesscom.functions'
import { fetchAllRows } from '@/lib/persist'
import {
  clearPlayerCache,
  readPlayerCache,
  writePlayerCache,
  type PlayerData,
} from '@/lib/playerCache'
import { getBrowserClient } from '@/lib/supabase/browser'
import { normalizeUsername } from '@/lib/username'

async function fetchPlayerDataFromDb(username: string): Promise<PlayerData> {
  const supabase = getBrowserClient()
  const [positions, games, periods, attempts, sync] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase.from('flagged_positions').select('*').eq('username', username).range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase.from('games').select('*').eq('username', username).range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from('period_summary')
        .select('*')
        .eq('username', username)
        .order('period_start')
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from('drill_attempts')
        .select('*')
        .eq('username', username)
        .order('attempted_at')
        .range(from, to),
    ),
    supabase.from('sync_state').select('*').eq('username', username).maybeSingle(),
  ])
  return {
    positions,
    games,
    periods,
    attempts,
    sync: sync.data,
  }
}

export async function loadPlayerData(
  username: string,
  options: { force?: boolean } = {},
): Promise<PlayerData> {
  const name = normalizeUsername(username)
  if (!options.force) {
    const cached = await readPlayerCache(name)
    if (cached) return cached
  }
  const data = await fetchPlayerDataFromDb(name)
  await writePlayerCache(name, data)
  return data
}

export async function refreshPlayerData(queryClient: QueryClient, username: string) {
  const name = normalizeUsername(username)
  await clearPlayerCache(name)
  const data = await loadPlayerData(name, { force: true })
  queryClient.setQueryData(['player', name], data)
  return data
}

export function usePlayerData(username: string) {
  const name = normalizeUsername(username)
  return useQuery({
    queryKey: ['player', name],
    queryFn: () => loadPlayerData(name, { force: true }),
    staleTime: 30_000,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}

export function useRecentGames(username: string, limit = 20) {
  const name = normalizeUsername(username)
  return useQuery({
    queryKey: ['recent-games', name, limit],
    queryFn: () => listRecentGames({ data: { username: name, limit } }),
    staleTime: 5 * 60 * 1000,
  })
}

export function useArchives(username: string, enabled = true) {
  const name = normalizeUsername(username)
  return useQuery({
    queryKey: ['archives', name],
    queryFn: () => listArchives({ data: { username: name } }),
    staleTime: 30 * 60 * 1000,
    enabled: Boolean(name) && enabled,
  })
}

export function useMonthGames(
  username: string,
  year: number | null,
  month: number | null,
) {
  const name = normalizeUsername(username)
  return useQuery({
    queryKey: ['month-games', name, year, month],
    queryFn: () =>
      listMonthGames({
        data: { username: name, year: year!, month: month! },
      }),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(name && year && month),
  })
}
