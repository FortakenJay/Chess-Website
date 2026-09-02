import { openingKeyTokens } from './matchPlayed'
import { OPENING_FAMILIES, familyForOpening, openingSearchQuery } from './families'

export type OpeningScoreStats = {
  games: number
  wins: number
  winPct: number
  leakWeight: number
}

export function openingScoreStats(
  opening: { name: string; eco: string | null },
  games: Array<{
    opening_name: string | null
    opening_eco: string | null
    result: string | null
    color: string | null
  }>,
  side?: 'w' | 'b',
): OpeningScoreStats {
  const eco = opening.eco?.trim().toUpperCase() ?? ''
  const tokens = openingKeyTokens(opening.name)
  const color = side === 'w' ? 'white' : side === 'b' ? 'black' : null
  let count = 0
  let wins = 0
  for (const game of games) {
    if (color && game.color !== color) continue
    const gameEco = game.opening_eco?.trim().toUpperCase() ?? ''
    const gameName = game.opening_name?.toLowerCase() ?? ''
    const match = (eco && gameEco === eco) ||
      (tokens.length > 0 && gameName && tokens.every((token) => gameName.includes(token)))
    if (!match) continue
    count += 1
    if (game.result === 'win') wins += 1
  }
  const winPct = count ? Math.round((1000 * wins) / count) / 10 : 0
  return {
    games: count,
    wins,
    winPct,
    leakWeight: count * Math.max(0, 50 - winPct),
  }
}

/** Different named system in the same family. Stats stay on the chooser, never on a knowledge card. */
export function learnInsteadQuery(opening: { name: string; eco: string | null }): string | null {
  const family = familyForOpening(opening)
  if (!family) return OPENING_FAMILIES[0]?.examples[0] ? openingSearchQuery(OPENING_FAMILIES[0].examples[0]!) : null
  const hay = opening.name.toLowerCase()
  for (const example of family.examples) {
    const query = openingSearchQuery(example)
    if (!hay.includes(example.toLowerCase()) && !hay.includes(query.toLowerCase())) return query
  }
  return null
}
