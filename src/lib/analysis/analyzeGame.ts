import { Chess, type Square } from 'chess.js'
import { centipawnLoss, classify } from './classify'
import { clockBucket, parseClk } from './clock'
import { detectMotif } from './motifs'
import { phaseOf } from './phase'
import {
  emptyClockStats,
  emptyPhaseStats,
  type EngineEval,
  type GameAnalysis,
  type Side,
} from './types'

export type RawGame = {
  pgn: string
  url: string
  endTime: number
  white?: string
  black?: string
  whiteResult?: string
  blackResult?: string
}

function outcomeFor(
  userIsWhite: boolean,
  result: string,
  whiteResult?: string,
  blackResult?: string,
): 'win' | 'loss' | 'draw' {
  const mine = userIsWhite ? whiteResult : blackResult
  if (mine === 'win') return 'win'
  const draws = new Set([
    'stalemate',
    'agreed',
    'repetition',
    'insufficient',
    '50move',
    'timevsinsufficient',
    'draw',
  ])
  if (mine && draws.has(mine)) return 'draw'
  if (result === '1/2-1/2') return 'draw'
  if (result === '1-0') return userIsWhite ? 'win' : 'loss'
  if (result === '0-1') return userIsWhite ? 'loss' : 'win'
  return 'loss'
}

function playedOn(headers: Record<string, string>, endTime: number): string {
  const raw = headers.UTCDate || headers.Date || ''
  const iso = raw.replace(/\./g, '-')
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  return new Date(endTime * 1000).toISOString().slice(0, 10)
}

export async function analyzeGame(
  game: RawGame,
  username: string,
  evaluate: (fen: string) => Promise<EngineEval>,
  options?: {
    signal?: AbortSignal
    onPly?: (info: { ply: number; plyTotal: number }) => void
    onFlagged?: (position: GameAnalysis['flagged'][number]) => void
  },
): Promise<GameAnalysis | null> {
  const chess = new Chess()
  try {
    chess.loadPgn(game.pgn)
  } catch {
    return null
  }

  const headers = chess.getHeaders()
  const white = (game.white || headers.White || '').toLowerCase()
  const black = (game.black || headers.Black || '').toLowerCase()
  const user = username.toLowerCase()
  if (white !== user && black !== user) return null

  const userIsWhite = white === user
  const color: Side = userIsWhite ? 'white' : 'black'
  const opponent = userIsWhite ? headers.Black || 'unknown' : headers.White || 'unknown'
  const date = playedOn(headers, game.endTime)
  const comments = new Map(chess.getComments().map((c) => [c.fen, c.comment]))
  const history = chess.history({ verbose: true })

  const phaseStats = emptyPhaseStats()
  const clockStats = emptyClockStats()
  const flagged: GameAnalysis['flagged'] = []
  let blunderCount = 0
  let mistakeCount = 0
  let inaccuracyCount = 0
  let totalMoves = 0

  const replay = new Chess()

  for (let i = 0; i < history.length; i++) {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const move = history[i]!
    const fenBefore = move.before
    const mover: Side = move.color === 'w' ? 'white' : 'black'

    if (mover === color) {
      const evalBefore = await evaluate(fenBefore)
      replay.move(move)
      const evalAfter = await evaluate(replay.fen())
      const loss = centipawnLoss(evalBefore, evalAfter, mover)
      const classification = classify(loss)
      const moveNumber = Number(fenBefore.split(' ')[5] ?? 1)
      const phase = phaseOf(moveNumber, fenBefore)
      const clockLeft = parseClk(comments.get(move.after))
      const bucket = phaseStats[phase]
      bucket.total += 1
      totalMoves += 1
      if (classification !== 'fine') bucket[classification] += 1
      if (clockLeft != null) {
        const clock = clockStats[clockBucket(clockLeft)]
        clock.total += 1
        if (classification !== 'fine') clock[classification] += 1
      }
      if (classification === 'blunder') blunderCount += 1
      if (classification === 'mistake') mistakeCount += 1
      if (classification === 'inaccuracy') inaccuracyCount += 1

      if (classification !== 'fine') {
        const mateForUser =
          evalBefore.mateForStm != null && evalBefore.mateForStm > 0
        const position = {
          username: user,
          playedOn: date,
          opponent,
          color,
          moveNumber,
          san: move.san,
          loss,
          classification,
          phase,
          clockLeft,
          fenBefore,
          gameLink: game.url,
          motif: detectMotif({
            fenBefore,
            userFrom: move.from as Square,
            userTo: move.to as Square,
            userSan: move.san,
            punishUci: evalAfter.bestMove,
            mateForUser,
          }),
        }
        flagged.push(position)
        options?.onFlagged?.(position)
      }
    } else {
      replay.move(move)
    }

    options?.onPly?.({ ply: i + 1, plyTotal: history.length })
  }

  return {
    username: user,
    playedOn: date,
    opponent,
    color,
    result: outcomeFor(
      userIsWhite,
      headers.Result ?? '*',
      game.whiteResult,
      game.blackResult,
    ),
    blunderCount,
    mistakeCount,
    inaccuracyCount,
    totalMoves,
    phaseStats,
    clockStats,
    gameLink: game.url,
    endTime: game.endTime,
    flagged,
  }
}
