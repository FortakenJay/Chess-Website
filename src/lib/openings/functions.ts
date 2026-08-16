import { createServerFn } from '@tanstack/react-start'
import { rankOpeningHits } from './searchCatalog'
import { parseMoveOrderSans } from './tree'
import { MAX_TEACHING_PLY } from './lessonFromOpening'

export const searchOpeningCatalog = createServerFn({ method: 'GET' })
  .validator((data: { query: string }) => {
    const query = typeof data?.query === 'string' ? data.query.trim() : ''
    if (query.length < 2 || query.length > 80) throw new Error('Name an opening')
    return { query }
  })
  .handler(async ({ data }) => {
    const { loadSearchBook } = await import('./ecoBook.server')
    return rankOpeningHits(await loadSearchBook(), data.query)
  })

export const extendOpeningLine = createServerFn({ method: 'GET' })
  .validator((data: { moves: string }) => {
    const moves = typeof data?.moves === 'string' ? data.moves.trim() : ''
    if (!moves || moves.length > 400) throw new Error('Invalid move list')
    return { moves }
  })
  .handler(async ({ data }) => {
    const sans = parseMoveOrderSans(data.moves)
    if (!sans.length) return []
    const { extendMostPlayedSans } = await import('./explorer')
    return (await extendMostPlayedSans(sans, 12)).slice(0, MAX_TEACHING_PLY)
  })
