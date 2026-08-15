import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { cachePlayerAvatar } from '@/lib/chesscom.functions'
import { normalizeUsername } from '@/lib/username'

/** Cached Chess.com avatar from Storage, or the signed-in profile URL. */
export function usePlayerAvatar(username?: string | null) {
  const name = username ? normalizeUsername(username) : ''
  const { profile } = useAuth()
  const owned = profile?.chess_com_username === name ? profile.avatar_url : null

  const query = useQuery({
    queryKey: ['avatar', name],
    queryFn: () => cachePlayerAvatar({ data: { username: name } }),
    staleTime: 12 * 60 * 60 * 1000,
    enabled: Boolean(name) && !owned,
  })

  return owned ?? query.data?.avatarUrl ?? null
}
