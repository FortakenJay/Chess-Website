import { normalizeUsername } from '@/lib/username'

export const AVATAR_BUCKET = 'avatars'

export function avatarObjectPath(username: string) {
  return `${normalizeUsername(username)}/avatar`
}

export function publicAvatarUrl(username: string, cacheKey?: string | number | null) {
  const base =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  if (!base || !username) return null
  const url = `${base.replace(/\/$/, '')}/storage/v1/object/public/${AVATAR_BUCKET}/${avatarObjectPath(username)}`
  return cacheKey != null && cacheKey !== '' ? `${url}?v=${encodeURIComponent(String(cacheKey))}` : url
}
