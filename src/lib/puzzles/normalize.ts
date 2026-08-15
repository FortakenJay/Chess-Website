import { Chess } from 'chess.js'
import { phaseOf } from '@/lib/analysis/phase'
import type { Phase, Side } from '@/lib/analysis/types'
import { motifFromLichessThemes, phaseFromLichessThemes } from './themes'
import type { PracticePuzzle } from './types'

function colorFromFen(fen: string): Side {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white'
}

function moveNumberFromFen(fen: string): number {
  const n = Number(fen.split(' ')[5] ?? '1')
  return Number.isFinite(n) && n > 0 ? n : 1
}

export function detectPhase(fen: string): Phase {
  return phaseOf(moveNumberFromFen(fen), fen)
}

export function playUci(board: Chess, uci: string): boolean {
  if (uci.length < 4) return false
  try {
    const move = board.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] ?? 'q',
    })
    return Boolean(move)
  } catch {
    return false
  }
}

function uciFromVerbose(move: { from: string; to: string; promotion?: string }) {
  return `${move.from}${move.to}${move.promotion ?? ''}`
}

export function normalizeLichessPuzzle(raw: {
  game: { id: string; pgn?: string }
  puzzle: {
    id: string
    rating: number
    solution: string[]
    themes: string[]
    initialPly?: number
  }
}): PracticePuzzle | null {
  if (!raw.game.pgn || raw.puzzle.solution.length === 0) return null

  try {
    const full = new Chess()
    full.loadPgn(raw.game.pgn)
    const moves = full.history({ verbose: true })
    const ply = raw.puzzle.initialPly ?? moves.length - 1
    const setup = new Chess()
    for (let i = 0; i <= ply && i < moves.length; i++) {
      setup.move(moves[i]!)
    }
    const fen = setup.fen()
    const themes = raw.puzzle.themes
    return {
      id: `lichess:${raw.puzzle.id}`,
      source: 'lichess',
      rating: raw.puzzle.rating,
      fen,
      solution: raw.puzzle.solution,
      themes,
      phase: phaseFromLichessThemes(themes, detectPhase(fen)),
      motif: motifFromLichessThemes(themes),
      color: colorFromFen(fen),
      url: `https://lichess.org/training/${raw.puzzle.id}`,
    }
  } catch {
    return null
  }
}

/** CSV row Moves: opponent setup UCI, then player/opponent solution line. */
export function normalizeLichessCsvRow(row: {
  PuzzleId: string
  FEN: string
  Moves: string
  Rating: string
  Themes: string
  GameUrl?: string
}): PracticePuzzle | null {
  const allMoves = row.Moves.trim().split(/\s+/).filter(Boolean)
  if (allMoves.length < 2) return null
  const board = new Chess(row.FEN)
  if (!playUci(board, allMoves[0]!)) return null
  const fen = board.fen()
  const themes = row.Themes.trim().split(/\s+/).filter(Boolean)
  return {
    id: `lichess:${row.PuzzleId}`,
    source: 'lichess',
    rating: Number(row.Rating) || null,
    fen,
    solution: allMoves.slice(1),
    themes,
    phase: phaseFromLichessThemes(themes, detectPhase(fen)),
    motif: motifFromLichessThemes(themes),
    color: colorFromFen(fen),
    url: row.GameUrl || `https://lichess.org/training/${row.PuzzleId}`,
  }
}

export function normalizeChessComPuzzle(raw: {
  title: string
  url: string
  fen: string
  pgn: string
  publish_time?: number
}): PracticePuzzle | null {
  try {
    const game = new Chess()
    game.loadPgn(raw.pgn)
    const moves = game.history({ verbose: true })
    if (moves.length === 0) return null
    const fen = raw.fen
    const solution = moves.map(uciFromVerbose)
    return {
      id: `chesscom:${raw.publish_time ?? raw.url}`,
      source: 'chesscom',
      rating: null,
      fen,
      solution,
      themes: [raw.title],
      phase: detectPhase(fen),
      motif: null,
      color: colorFromFen(fen),
      url: raw.url,
    }
  } catch {
    return null
  }
}
