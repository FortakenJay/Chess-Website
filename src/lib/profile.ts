import { cachePlayerAvatar } from '@/lib/chesscom.functions'
import { getBrowserClient } from '@/lib/supabase/browser'
import type { Tables } from '@/lib/supabase/database.types'
import { normalizeUsername } from '@/lib/username'

/** Link the signed-in user to a Chess.com handle without writing user_id from the client. */
export async function linkChessUsername(username: string): Promise<Tables<'profiles'>> {
  const handle = normalizeUsername(username)
  const { data, error } = await getBrowserClient().rpc('link_chess_username', {
    p_username: handle,
  })
  if (error) throw error
  if (!data) throw new Error('Could not link Chess.com username')
  const row = data as Tables<'profiles'>
  try {
    const cached = await cachePlayerAvatar({ data: { username: handle } })
    if (cached.avatarUrl) return { ...row, avatar_url: cached.avatarUrl }
  } catch {
    // Profile link still succeeds if the avatar download fails.
  }
  return row
}
