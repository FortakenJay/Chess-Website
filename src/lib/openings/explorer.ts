import { Chess } from 'chess.js'
import type { BuiltNode, ExplorerReply, NodeSource } from './types'

const EXPLORER_URLS = ['https://explorer.lichess.ovh/lichess']
const BANDS = [0, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500]
export const EXPLORER_MIN_PCT = 1.5
const UA = process.env.CHESSCOM_USER_AGENT || 'leak/1.0 (personal chess analysis)'

export function ratingBandsAround(elo: number, spread = 100): number[] {
  const lo = elo - spread
  const hi = elo + spread
  return BANDS.filter((band, index) => {
    const top = (BANDS[index + 1] ?? 4000) - 1
    return band <= hi && top >= lo
  })
}

type ExplorerMove = {
  uci: string
  san: string
  white: number
  draws: number
  black: number
  averageRating?: number
}

type ExplorerResponse = {
  white: number
  draws: number
  black: number
  moves: ExplorerMove[]
}

async function fetchExplorer(
  fen: string,
  ratings: number[],
): Promise<ExplorerResponse> {
  const params = new URLSearchParams({
    variant: 'standard',
    fen,
    speeds: 'blitz,rapid,classical',
    ratings: ratings.join(','),
    moves: '12',
  })
  let last: Error | null = null
  for (const base of EXPLORER_URLS) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const response = await fetch(`${base}?${params}`, {
          headers: { Accept: 'application/json', 'User-Agent': UA },
        })
        if (response.status === 429) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
          continue
        }
        if (!response.ok) {
          last = new Error(`${response.status} from ${base}`)
          continue
        }
        return (await response.json()) as ExplorerResponse
      } catch (error) {
        last = error instanceof Error ? error : new Error(String(error))
      }
    }
  }
  throw last ?? new Error('Lichess explorer failed')
}

export function repliesFromExplorer(
  data: ExplorerResponse,
  ratingBand: string,
  trainedSide: 'w' | 'b',
): ExplorerReply[] {
  const total = data.white + data.draws + data.black
  if (!total) return []
  return data.moves.map((move) => {
    const plays = move.white + move.draws + move.black
    const wins = trainedSide === 'w' ? move.white : move.black
    return {
      rating_band: ratingBand,
      san: move.san,
      plays,
      pct: Math.round((1000 * plays) / total) / 10,
      win_pct: plays ? Math.round((1000 * wins) / plays) / 10 : null,
    }
  })
}

export type ExplorerExpansion = {
  stats: ExplorerReply[]
  newNodes: BuiltNode[]
}

export function expandNodeFromExplorer(
  node: BuiltNode,
  replies: ExplorerReply[],
  trainedSide: 'w' | 'b',
  existingChildren: BuiltNode[],
  idFactory: () => string = () => crypto.randomUUID(),
): ExplorerExpansion {
  const stats = replies.filter((row) => row.pct >= EXPLORER_MIN_PCT)
  const have = new Set(existingChildren.map((child) => child.san))
  const board = new Chess(node.fen)
  const stm: 'w' | 'b' = board.turn()
  const newNodes: BuiltNode[] = []

  for (const reply of stats) {
    if (have.has(reply.san)) continue
    const fork = new Chess(node.fen)
    const played = fork.move(reply.san)
    if (!played) continue
    newNodes.push({
      id: idFactory(),
      parent_node_id: node.id,
      fen: fork.fen(),
      ply: node.ply + 1,
      san: played.san,
      is_mine: stm === trainedSide,
      source: 'explorer' satisfies NodeSource,
      reason_tags: [],
      reason_text: null,
      alternatives: [],
      explorer_stats: [reply],
      frequency_weight: reply.pct / 100,
    })
    have.add(reply.san)
  }

  return { stats, newNodes }
}

export async function explorerForFen(fen: string, elo: number): Promise<ExplorerReply[]> {
  const bands = ratingBandsAround(elo)
  const data = await fetchExplorer(fen, bands.length ? bands : [1600, 1800])
  return repliesFromExplorer(data, bands.join('-') || '1600-1800', fen.split(' ')[1] === 'b' ? 'b' : 'w')
}

const EXTEND_MIN_GAMES = 80
const EXTEND_MIN_SHARE = 0.12

/** Walk the most-played club continuation. Does not invent reasons or write frequencies onto a card. */
export async function extendMostPlayedSans(sans: string[], targetPly = 12): Promise<string[]> {
  const board = new Chess()
  for (const san of sans) {
    const played = board.move(san)
    if (!played) throw new Error(`Illegal ${san}`)
  }
  const ratings = [1600, 1800]
  while (board.history().length < targetPly) {
    const data = await fetchExplorer(board.fen(), ratings)
    const total = data.white + data.draws + data.black
    const best = data.moves[0]
    if (!best || total < EXTEND_MIN_GAMES) break
    const plays = best.white + best.draws + best.black
    if (plays / total < EXTEND_MIN_SHARE) break
    if (!board.move(best.san)) break
  }
  return board.history()
}
