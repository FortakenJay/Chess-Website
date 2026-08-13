export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function isLikelyUsername(value: string): boolean {
  return /^[a-zA-Z0-9_-]{2,25}$/.test(value.trim())
}
