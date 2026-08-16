const STOP = new Set([
  'game',
  'defence',
  'defense',
  'variation',
  'attack',
  'system',
  'opening',
  'the',
  'and',
])

export function openingKeyTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !STOP.has(token))
}

export function matchesOpeningQuery(
  opening: { name: string; eco: string | null } | null | undefined,
  query: string,
): boolean {
  if (!opening?.name) return false
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) return false
  const haystack = `${opening.name} ${opening.eco ?? ''}`.toLowerCase()
  if (haystack.includes(needle)) return true
  const tokens = openingKeyTokens(opening.name)
  const words = needle.split(/\s+/).filter(Boolean)
  return words.every(
    (word) => haystack.includes(word) || tokens.some((token) => token.startsWith(word)),
  )
}

export function openingPlayedCount(
  opening: { name: string; eco: string | null },
  games: Array<{ opening_name: string | null; opening_eco: string | null }>,
): number {
  const eco = opening.eco?.trim().toUpperCase() ?? ''
  const tokens = openingKeyTokens(opening.name)
  return games.filter((game) => {
    const gameEco = game.opening_eco?.trim().toUpperCase() ?? ''
    if (eco && gameEco === eco) return true
    const gameName = game.opening_name?.toLowerCase() ?? ''
    if (!gameName || tokens.length === 0) return false
    return tokens.every((token) => gameName.includes(token))
  }).length
}
