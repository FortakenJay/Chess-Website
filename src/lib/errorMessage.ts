/** Render Error, Supabase/PostgREST errors, and worker-cloned errors usefully. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>
    const parts = [value.message, value.details, value.hint]
      .filter((part): part is string => typeof part === 'string' && part.length > 0)
    const code = typeof value.code === 'string' ? value.code : null
    if (parts.length) return `${code ? `${code}: ` : ''}${[...new Set(parts)].join(' — ')}`
    try {
      return JSON.stringify(error)
    } catch {
      // Fall through.
    }
  }
  return String(error)
}
