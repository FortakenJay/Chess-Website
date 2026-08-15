import type { Tables } from '@/lib/supabase/database.types'
import {
  canUseIdb,
  idbRequest,
  LEAK_CACHE_SCHEMA_VERSION,
  openIdb,
} from '@/lib/idbCache'

export type PlayerData = {
  positions: Tables<'flagged_positions'>[]
  games: Tables<'games'>[]
  periods: Tables<'period_summary'>[]
  attempts: Tables<'drill_attempts'>[]
  sync: Tables<'sync_state'> | null
}

const DB_NAME = 'leak-player-cache'
const STORE = 'players'
const DB_VERSION = 1

type CacheEntry = {
  version: number
  username: string
  savedAt: string
  data: PlayerData
}

export async function readPlayerCache(username: string): Promise<PlayerData | null> {
  if (!canUseIdb()) return null
  try {
    const db = await openIdb(DB_NAME, STORE, DB_VERSION)
    try {
      const tx = db.transaction(STORE, 'readonly')
      const entry = await idbRequest<CacheEntry | undefined>(tx.objectStore(STORE).get(username))
      if (
        !entry ||
        entry.version !== LEAK_CACHE_SCHEMA_VERSION ||
        entry.username !== username
      ) {
        return null
      }
      return entry.data
    } finally {
      db.close()
    }
  } catch {
    return null
  }
}

export async function writePlayerCache(username: string, data: PlayerData): Promise<void> {
  if (!canUseIdb()) return
  try {
    const db = await openIdb(DB_NAME, STORE, DB_VERSION)
    try {
      const tx = db.transaction(STORE, 'readwrite')
      const entry: CacheEntry = {
        version: LEAK_CACHE_SCHEMA_VERSION,
        username,
        savedAt: new Date().toISOString(),
        data,
      }
      await idbRequest(tx.objectStore(STORE).put(entry, username))
    } finally {
      db.close()
    }
  } catch {
    // Quota or private-mode failures should not break the app.
  }
}

export async function clearPlayerCache(username: string): Promise<void> {
  if (!canUseIdb()) return
  try {
    const db = await openIdb(DB_NAME, STORE, DB_VERSION)
    try {
      const tx = db.transaction(STORE, 'readwrite')
      await idbRequest(tx.objectStore(STORE).delete(username))
    } finally {
      db.close()
    }
  } catch {
    // ignore
  }
}
