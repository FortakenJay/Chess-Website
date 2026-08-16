import { parseMoveOrderSans } from './tree'
import { expandSearchQuery, nicknameCanonical } from './nicknames'

export type OpeningSearchHit = {
  name: string
  eco: string
  moves: string
  isEcoRoot: boolean
}

export function openingHitKey(hit: Pick<OpeningSearchHit, 'name' | 'eco' | 'moves'>): string {
  return `${hit.eco}|${hit.name}|${hit.moves}`
}

export type OpeningSearchInput = {
  name: string
  eco: string
  moves: string
  isEcoRoot?: boolean
  aliases?: string[]
}

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
  'line',
  'declined',
  'accepted',
])

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOP.has(token))
}

function splitName(name: string): { head: string; rest: string } {
  const index = name.indexOf(':')
  if (index === -1) {
    const comma = name.indexOf(',')
    if (comma === -1) return { head: name, rest: '' }
    return { head: name.slice(0, comma), rest: name.slice(comma + 1) }
  }
  return { head: name.slice(0, index), rest: name.slice(index + 1) }
}

function scoreHit(opening: OpeningSearchInput | null | undefined, query: string): number {
  if (!opening) return 0
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) return 0
  const name = opening.name ?? ''
  const eco = (opening.eco ?? '').toUpperCase()
  const moves = opening.moves ?? ''
  if (!name || !moves) return 0

  const queryTokens = tokens(needle)
  const nameTokens = tokens(name)
  const aliasTokens = tokens((opening.aliases ?? []).join(' '))
  const hayTokens = [...new Set([...nameTokens, ...aliasTokens])]
  if (queryTokens.length === 0) return 0
  if (!queryTokens.every((token) => hayTokens.some((hay) => hay.startsWith(token) || token.startsWith(hay)))) {
    if (eco && eco === needle.replace(/\s+/g, '').toUpperCase()) return 80
    return 0
  }

  const { head, rest } = splitName(name)
  const variationTokens = tokens(rest)
  const openingTokens = tokens(head)
  let score = 40
  for (const token of queryTokens) {
    if (variationTokens.some((row) => row === token || row.startsWith(token))) score += 36
    else if (openingTokens.some((row) => row === token || row.startsWith(token))) score += 12
    else score += 6
  }
  const extraVariation = variationTokens.filter(
    (token) => !queryTokens.some((queryToken) => token.startsWith(queryToken) || queryToken.startsWith(token)),
  )
  score -= extraVariation.length * 14
  if (name.toLowerCase() === needle) score += 40
  if (opening.isEcoRoot) score += 4
  const ply = parseMoveOrderSans(moves).length
  if (ply < 2) score -= 30
  else if (ply >= 8 && ply <= 12) score += 8
  else if (ply > 16) score -= Math.min(12, ply - 16)
  return score
}

function bestScore(opening: OpeningSearchInput, original: string, expanded: string): number {
  const a = scoreHit(opening, original)
  if (expanded === original.trim()) return a
  return Math.max(a, scoreHit(opening, expanded))
}

export function rankOpeningHits(
  openings: OpeningSearchInput[],
  query: string,
  limit = 16,
): OpeningSearchHit[] {
  const expanded = expandSearchQuery(query)
  const nick = nicknameCanonical(query)
  const extras: OpeningSearchInput[] = nick
    ? [
        {
          name: nick.name,
          eco: nick.eco,
          moves: nick.moves,
          isEcoRoot: true,
          aliases: nick.keys,
        },
      ]
    : []
  const ranked = [...extras, ...openings]
    .filter((opening): opening is OpeningSearchInput => Boolean(opening?.name && opening.moves))
    .map((opening) => ({
      opening,
      score: bestScore(opening, query, expanded) + (nick && opening.name === nick.name ? 20 : 0),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.opening.name.localeCompare(b.opening.name))

  const seen = new Set<string>()
  const hits: OpeningSearchHit[] = []
  for (const row of ranked) {
    const key = `${row.opening.name.toLowerCase()}|${row.opening.moves}`
    if (seen.has(key)) continue
    seen.add(key)
    hits.push({
      name: row.opening.name,
      eco: row.opening.eco ?? '',
      moves: row.opening.moves,
      isEcoRoot: Boolean(row.opening.isEcoRoot),
    })
    if (hits.length >= limit) break
  }
  return hits
}
