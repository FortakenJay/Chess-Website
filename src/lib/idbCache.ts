/** Shared IndexedDB helpers + schema version for all LEAK client caches. */
export const LEAK_CACHE_SCHEMA_VERSION = 6

export function canUseIdb() {
  return typeof indexedDB !== 'undefined'
}

export function openIdb(
  dbName: string,
  store: string,
  dbVersion = 1,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(store)) {
        db.createObjectStore(store)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
  })
}

export function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}
