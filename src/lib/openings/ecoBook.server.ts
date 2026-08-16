import { openingBook, type Opening } from '@chess-openings/eco.json'
import type { OpeningSearchInput } from './searchCatalog'
import type { LessonVariation } from './types'

let bookPromise: Promise<OpeningSearchInput[]> | null = null

function asSearchInput(opening: Opening | null | undefined): OpeningSearchInput | null {
  if (!opening || typeof opening.name !== 'string' || typeof opening.moves !== 'string') {
    return null
  }
  return {
    name: opening.name,
    eco: typeof opening.eco === 'string' ? opening.eco : '',
    moves: opening.moves,
    isEcoRoot: opening.isEcoRoot,
    aliases: Object.values(opening.aliases ?? {}).filter((value): value is string => Boolean(value)),
  }
}

function flattenOpenings(value: unknown, into: OpeningSearchInput[]) {
  const mapped = asSearchInput(value as Opening)
  if (mapped) {
    into.push(mapped)
    return
  }
  if (!value || typeof value !== 'object') return
  for (const child of Object.values(value)) {
    flattenOpenings(child, into)
  }
}

export async function loadSearchBook(): Promise<OpeningSearchInput[]> {
  bookPromise ??= openingBook().then((book) => {
    const rows: OpeningSearchInput[] = []
    flattenOpenings(book, rows)
    return rows
  })
  return bookPromise
}

export function siblingVariations(
  book: OpeningSearchInput[],
  eco: string,
  name: string,
): LessonVariation[] {
  if (!eco) return []
  const seen = new Set<string>()
  const rows: LessonVariation[] = []
  const candidates = book
    .filter((opening) => opening.eco === eco && opening.name !== name)
    .sort((a, b) => Number(b.isEcoRoot) - Number(a.isEcoRoot) || a.name.localeCompare(b.name))
  for (const opening of candidates) {
    if (seen.has(opening.name)) continue
    seen.add(opening.name)
    rows.push({
      name: opening.name,
      line: opening.moves,
      idea: 'A named branch in the same ECO code. Walk it; do not invent a reason that is not on the card.',
    })
    if (rows.length >= 3) break
  }
  return rows
}
