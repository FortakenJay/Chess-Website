import { Chess } from 'chess.js'
import type { ChessComGame } from '@/lib/chesscom'
import type { Side } from './types'

export type GameMeta = {
  gameLink: string
  pgn: string
  endTime: number
  playedOn: string
  white: string
  black: string
  color: Side
  opponent: string
  result: 'win' | 'loss' | 'draw'
  userRating: number | null
  opponentRating: number | null
  ratingDelta: number | null
  openingEco: string | null
  openingName: string | null
  timeClass: string | null
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
  // Prefer finish time — daily games keep the start date in [Date] / [UTCDate].
  if (endTime > 0) return new Date(endTime * 1000).toISOString().slice(0, 10)
  const raw = headers.UTCDate || headers.Date || ''
  const iso = raw.replace(/\./g, '-')
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  return new Date().toISOString().slice(0, 10)
}

function cleanOpening(name: string | null): string | null {
  if (!name) return null
  try {
    const url = new URL(name)
    const slug = url.pathname.split('/').filter(Boolean).at(-1)
    if (!slug) return name
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  } catch {
    return name
  }
}

/** Fast PGN header parse — no engine. Used for the free review game list. */
export function parseGameMeta(game: ChessComGame, username: string): GameMeta | null {
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
  const opponent = userIsWhite
    ? game.black || headers.Black || 'unknown'
    : game.white || headers.White || 'unknown'
  const userRating = userIsWhite ? (game.whiteRating ?? null) : (game.blackRating ?? null)
  const opponentRating = userIsWhite ? (game.blackRating ?? null) : (game.whiteRating ?? null)

  return {
    gameLink: game.url,
    pgn: game.pgn,
    endTime: game.endTime,
    playedOn: playedOn(headers, game.endTime),
    white: game.white || headers.White || white,
    black: game.black || headers.Black || black,
    color,
    opponent,
    result: outcomeFor(userIsWhite, headers.Result ?? '*', game.whiteResult, game.blackResult),
    userRating,
    opponentRating,
    ratingDelta: null,
    openingEco: headers.ECO || null,
    openingName: cleanOpening(headers.Opening || headers.ECOUrl || null),
    timeClass: game.timeClass ?? null,
  }
}

export function relativePlayedLabel(endTime: number, now = Date.now()): string {
  const diffSec = Math.max(0, Math.floor(now / 1000 - endTime))
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  const days = Math.floor(diffSec / 86400)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export type PerformanceGrade = 'underperforming' | 'solid' | 'strong'

export function performanceGrade(input: {
  accuracyPct: number
  blunderCount: number
  mistakeCount: number
}): PerformanceGrade {
  if (input.accuracyPct < 72 || input.blunderCount >= 2 || input.mistakeCount + input.blunderCount >= 4) {
    return 'underperforming'
  }
  if (input.accuracyPct >= 85 && input.blunderCount === 0) return 'strong'
  return 'solid'
}
