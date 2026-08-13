import { useQuery } from '@tanstack/react-query'
import { fetchAllRows } from '@/lib/persist'
import { getBrowserClient } from '@/lib/supabase/browser'
import { normalizeUsername } from '@/lib/username'

export function usePlayerData(username: string) {
  const name = normalizeUsername(username)
  return useQuery({
    queryKey: ['player', name],
    queryFn: async () => {
      const supabase = getBrowserClient()
      const [positions, games, periods, attempts, sync] = await Promise.all([
        fetchAllRows((from, to) =>
          supabase.from('flagged_positions').select('*').eq('username', name).range(from, to),
        ),
        fetchAllRows((from, to) =>
          supabase.from('games').select('*').eq('username', name).range(from, to),
        ),
        fetchAllRows((from, to) =>
          supabase
            .from('period_summary')
            .select('*')
            .eq('username', name)
            .order('period_start')
            .range(from, to),
        ),
        fetchAllRows((from, to) =>
          supabase
            .from('drill_attempts')
            .select('*')
            .eq('username', name)
            .order('attempted_at')
            .range(from, to),
        ),
        supabase.from('sync_state').select('*').eq('username', name).maybeSingle(),
      ])
      return {
        positions,
        games,
        periods,
        attempts,
        sync: sync.data,
      }
    },
  })
}
