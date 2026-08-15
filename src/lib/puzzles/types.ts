import type { Motif, Phase, Side } from '@/lib/analysis/types'

export type PuzzleSource = 'lichess' | 'chesscom'

export type PracticePuzzle = {
  id: string
  source: PuzzleSource
  rating: number | null
  fen: string
  /** UCI line starting with the player's first move (opponent replies interleaved). */
  solution: string[]
  themes: string[]
  phase: Phase
  motif: Motif | null
  color: Side
  url: string
}

export type PuzzleRatingBand = 'suited' | 'easier' | 'harder' | 'any'

export type PuzzleFocus =
  | ''
  | 'this_week'
  | 'this_month'
  | 'opening'
  | 'middlegame'
  | 'endgame'
  | 'suited_elo'

export type PuzzleFilters = {
  phase: Phase | ''
  motif: Motif | ''
  color: Side | ''
  source: PuzzleSource | ''
  /** Prefer puzzles near the player's Chess.com Elo. */
  ratingBand: PuzzleRatingBand
  /** Explicit rating window (overrides band when both min/max set). */
  ratingMin: number | ''
  ratingMax: number | ''
  /** Soft focus chips that shape phase / rating defaults. */
  focus: PuzzleFocus
}
