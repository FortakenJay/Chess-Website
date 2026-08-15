import { AVATAR_BUCKET, avatarObjectPath } from '@/lib/avatar'
import { chessComUserAgent, fetchPlayer } from '@/lib/chesscom'
import { getServiceClient } from '@/lib/supabase/admin'
import { normalizeUsername } from '@/lib/username'

const MAX_BYTES = 2_000_000
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function mimeFrom(response: Response, sourceUrl: string) {
  const raw = (response.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase()
  if (raw && ALLOWED_TYPES.has(raw)) return raw
  const lower = sourceUrl.toLowerCase()
  if (lower.includes('.png')) return 'image/png'
  if (lower.includes('.webp')) return 'image/webp'
  if (lower.includes('.gif')) return 'image/gif'
  return 'image/jpeg'
}

async function existingPublicUrl(username: string) {
  const name = normalizeUsername(username)
  const admin = getServiceClient()
  const { data: files } = await admin.storage.from(AVATAR_BUCKET).list(name, { limit: 8 })
  const found = files?.some((file) => file.name === 'avatar' || file.name.startsWith('avatar.'))
  if (!found) return null
  return admin.storage.from(AVATAR_BUCKET).getPublicUrl(avatarObjectPath(name)).data.publicUrl
}

/** Download the Chess.com avatar and upsert it into the public avatars bucket. */
export async function storeChessComAvatar(
  username: string,
  options: { force?: boolean } = {},
): Promise<string | null> {
  const name = normalizeUsername(username)
  const admin = getServiceClient()

  if (!options.force) {
    const existing = await existingPublicUrl(name)
    if (existing) {
      await admin.from('profiles').update({ avatar_url: existing }).eq('chess_com_username', name)
      return existing
    }
  }

  const player = await fetchPlayer(name)
  const source = player.avatar?.trim()
  if (!source) return null

  const image = await fetch(source, {
    headers: {
      'User-Agent': chessComUserAgent(),
      Accept: 'image/*',
    },
  })
  if (!image.ok) throw new Error(`Could not download Chess.com avatar (${image.status})`)

  const bytes = new Uint8Array(await image.arrayBuffer())
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return null

  const contentType = mimeFrom(image, source)
  const path = avatarObjectPath(name)
  const { error } = await admin.storage.from(AVATAR_BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
    cacheControl: '86400',
  })
  if (error) throw error

  const publicUrl = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl
  const stored = options.force ? `${publicUrl}?v=${Date.now()}` : publicUrl
  await admin.from('profiles').update({ avatar_url: stored }).eq('chess_com_username', name)
  return stored
}
