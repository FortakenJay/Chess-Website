import { createServerFn } from '@tanstack/react-start'
import { rankOpeningHits } from './searchCatalog'
import { parseMoveOrderSans } from './tree'
import { MAX_TEACHING_PLY } from './lessonFromOpening'
import { parseLichessStudyId } from './pgnTree'

const UA = process.env.CHESSCOM_USER_AGENT || 'leak/1.0 (personal chess analysis)'

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

export const fetchExplorerSlice = createServerFn({ method: 'GET' })
  .validator((data: { fen: string; elo?: number }) => {
    const fen = typeof data?.fen === 'string' ? data.fen.trim() : ''
    if (fen.split(' ').length < 4 || fen.length > 120) throw new Error('Invalid position')
    const elo = typeof data?.elo === 'number' && data.elo > 0 ? data.elo : 1700
    return { fen, elo }
  })
  .handler(async ({ data }) => {
    const { explorerSliceForFen, ratingBandLabel } = await import('./explorer')
    const band = ratingBandLabel(data.elo)
    try {
      const { getServiceClient } = await import('@/lib/supabase/admin')
      const client = getServiceClient()
      const { data: cached } = await client
        .from('opening_explorer_cache')
        .select('payload, corpus')
        .eq('fen', data.fen)
        .eq('rating_band', band)
      if (cached && cached.length >= 1) {
        const club = cached.find((row) => row.corpus === 'club')?.payload
        const masters = cached.find((row) => row.corpus === 'masters')?.payload
        if (club && typeof club === 'object') {
          return club as Awaited<ReturnType<typeof explorerSliceForFen>>
        }
        void masters
      }
      const slice = await explorerSliceForFen(data.fen, data.elo)
      await client.from('opening_explorer_cache').upsert({
        fen: data.fen,
        corpus: 'club',
        rating_band: band,
        payload: slice as unknown as import('@/lib/supabase/database.types').Json,
      })
      return slice
    } catch {
      return explorerSliceForFen(data.fen, data.elo)
    }
  })

export const fetchStudyPgn = createServerFn({ method: 'GET' })
  .validator((data: { studyId: string }) => {
    const studyId = parseLichessStudyId(typeof data?.studyId === 'string' ? data.studyId : '')
    if (!studyId) throw new Error('Paste a public Lichess study URL')
    return { studyId }
  })
  .handler(async ({ data }) => {
    const url = `https://lichess.org/api/study/${data.studyId}.pgn?comments=true&variations=true&clocks=false`
    const response = await fetch(url, { headers: { Accept: 'application/x-chess-pgn', 'User-Agent': UA } })
    if (response.status === 404) throw new Error('That study is missing or not public')
    if (response.status === 429) throw new Error('Lichess asked us to wait a minute. Try again shortly.')
    if (!response.ok) throw new Error(`Could not fetch study (${response.status})`)
    const pgn = await response.text()
    if (!pgn.trim()) throw new Error('That study has no moves')
    return pgn
  })

export const fetchOpeningPack = createServerFn({ method: 'GET' })
  .validator((data: { packKey: string }) => {
    const packKey = typeof data?.packKey === 'string' ? data.packKey.trim() : ''
    if (!packKey || packKey.length > 200) throw new Error('Invalid pack')
    return { packKey }
  })
  .handler(async ({ data }) => {
    try {
      const { getServiceClient } = await import('@/lib/supabase/admin')
      const { data: row, error } = await getServiceClient()
        .from('opening_packs')
        .select('payload')
        .eq('pack_key', data.packKey)
        .maybeSingle()
      if (error) throw error
      return row?.payload ?? null
    } catch {
      return null
    }
  })

export const saveOpeningPack = createServerFn({ method: 'POST' })
  .validator((data: {
    packKey: string
    openingName: string
    side: 'w' | 'b'
    ratingBand: string
    generatorVersion: number
    payload: unknown
  }) => {
    if (!data?.packKey || !data.openingName) throw new Error('Invalid pack')
    return data
  })
  .handler(async ({ data }) => {
    try {
      const { getServiceClient } = await import('@/lib/supabase/admin')
      await getServiceClient().from('opening_packs').upsert(
        {
          pack_key: data.packKey,
          opening_name: data.openingName,
          side: data.side,
          rating_band: data.ratingBand,
          generator_version: data.generatorVersion,
          payload: data.payload as import('@/lib/supabase/database.types').Json,
        },
        { onConflict: 'pack_key', ignoreDuplicates: true },
      )
    } catch {
      // Pack cache is optional.
    }
  })
