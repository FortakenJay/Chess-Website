import { Chess } from 'chess.js'
import type { BuiltNode, ExplorerReply, ModelGameRef, NodeSource } from './types'

const CLUB_URL = 'https://explorer.lichess.ovh/lichess'
const MASTERS_URL = 'https://explorer.lichess.ovh/masters'
const BANDS = [0, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500]
export const EXPLORER_MIN_PCT = 1.5
export const EXPLORER_RATE_LIMIT_MS = 60_000
const UA = process.env.CHESSCOM_USER_AGENT || 'leak/1.0 (personal chess analysis)'

export function ratingBandsAround(elo: number, spread = 100): number[] {
  const lo = elo - spread
  const hi = elo + spread
  return BANDS.filter((band, index) => {
    const top = (BANDS[index + 1] ?? 4000) - 1
    return band <= hi && top >= lo
  })
}

export function ratingBandLabel(elo: number): string {
  const bands = ratingBandsAround(elo)
  return bands.length ? `${bands[0]}-${bands.at(-1)}` : '1600-1800'
}

type ExplorerMove = {
  uci: string
  san: string
  white: number
  draws: number
  black: number
  averageRating?: number
}

type ExplorerGame = {
  id?: string
  winner?: string | null
  year?: number
  white?: { name?: string; rating?: number }
  black?: { name?: string; rating?: number }
}

type ExplorerResponse = {
  white: number
  draws: number
  black: number
  moves: ExplorerMove[]
  topGames?: ExplorerGame[]
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchExplorerUrl(url: string): Promise<ExplorerResponse> {
  let last: Error | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': UA },
      })
      if (response.status === 429) {
        await sleep(EXPLORER_RATE_LIMIT_MS)
        continue
      }
      if (!response.ok) {
        last = new Error(`${response.status} from explorer`)
        continue
      }
      return (await response.json()) as ExplorerResponse
    } catch (error) {
      last = error instanceof Error ? error : new Error(String(error))
    }
  }
  throw last ?? new Error('Lichess explorer failed')
}

async function fetchClubExplorer(fen: string, ratings: number[]): Promise<ExplorerResponse> {
  const params = new URLSearchParams({
    variant: 'standard',
    fen,
    speeds: 'blitz,rapid,classical',
    ratings: ratings.join(','),
    moves: '12',
    topGames: '4',
  })
  return fetchExplorerUrl(`${CLUB_URL}?${params}`)
}

async function fetchMastersExplorer(fen: string): Promise<ExplorerResponse> {
  const params = new URLSearchParams({
    variant: 'standard',
    fen,
    moves: '12',
    topGames: '4',
  })
  return fetchExplorerUrl(`${MASTERS_URL}?${params}`)
}

export function gamesFromExplorer(data: ExplorerResponse): ModelGameRef[] {
  return (data.topGames ?? [])
    .filter((game) => game.id)
    .map((game) => ({
      id: game.id!,
      white: game.white?.name ?? 'White',
      black: game.black?.name ?? 'Black',
      year: game.year,
      winner:
        game.winner === 'white' || game.winner === 'black' || game.winner === 'draw'
          ? game.winner
          : null,
    }))
}

export function repliesFromExplorer(
  data: ExplorerResponse,
  ratingBand: string,
  trainedSide: 'w' | 'b',
  corpus: 'club' | 'masters' = 'club',
): ExplorerReply[] {
  const total = data.white + data.draws + data.black
  if (!total) return []
  const games = gamesFromExplorer(data)
  return data.moves.map((move) => {
    const plays = move.white + move.draws + move.black
    const wins = trainedSide === 'w' ? move.white : move.black
    return {
      rating_band: ratingBand,
      san: move.san,
      plays,
      pct: Math.round((1000 * plays) / total) / 10,
      win_pct: plays ? Math.round((1000 * wins) / plays) / 10 : null,
      corpus,
      games: corpus === 'masters' ? games : undefined,
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
      commentary: null,
    })
    have.add(reply.san)
  }

  return { stats, newNodes }
}

export type ExplorerSlice = {
  club: ExplorerReply[]
  masters: ExplorerReply[]
  games: ModelGameRef[]
}

export async function explorerSliceForFen(fen: string, elo: number): Promise<ExplorerSlice> {
  const bands = ratingBandsAround(elo)
  const ratings = bands.length ? bands : [1600, 1800]
  const label = bands.join('-') || '1600-1800'
  const side: 'w' | 'b' = fen.split(' ')[1] === 'b' ? 'b' : 'w'
  const clubData = await fetchClubExplorer(fen, ratings)
  const club = repliesFromExplorer(clubData, label, side, 'club')
  let masters: ExplorerReply[] = []
  let games = gamesFromExplorer(clubData)
  try {
    const masterData = await fetchMastersExplorer(fen)
    masters = repliesFromExplorer(masterData, 'masters', side, 'masters')
    const masterGames = gamesFromExplorer(masterData)
    if (masterGames.length) games = masterGames
  } catch {
    // Masters explorer is optional evidence.
  }
  return { club, masters, games }
}

export async function explorerForFen(fen: string, elo: number): Promise<ExplorerReply[]> {
  const slice = await explorerSliceForFen(fen, elo)
  return [...slice.club, ...slice.masters]
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
    const data = await fetchClubExplorer(board.fen(), ratings)
    const total = data.white + data.draws + data.black
    const best = data.moves[0]
    if (!best || total < EXTEND_MIN_GAMES) break
    const plays = best.white + best.draws + best.black
    if (plays / total < EXTEND_MIN_SHARE) break
    if (!board.move(best.san)) break
  }
  return board.history()
}
