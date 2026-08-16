import { builtOpeningFromCard } from './buildFromCard'
import { lessonFromOpening } from './lessonFromOpening'
import { formatMoveOrder, parseMoveOrderSans } from './tree'
import type { BuiltOpening, TrainedSide } from './types'

export function openingFromDownloadHit(input: {
  name: string
  eco?: string | null
  moves: string
  side: TrainedSide
}): BuiltOpening {
  const name = input.name?.trim()
  const moves = input.moves?.trim()
  if (!name || !moves) throw new Error('That download has no name or moves')
  const sans = parseMoveOrderSans(moves)
  if (!sans.length) throw new Error('That line has no moves')
  return builtOpeningFromCard(
    lessonFromOpening({
      name,
      eco: input.eco?.trim() || null,
      moves: formatMoveOrder(sans),
      side: input.side,
    }),
  )
}
