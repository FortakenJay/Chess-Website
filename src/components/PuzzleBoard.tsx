import { Chess } from 'chess.js'
import { useReducer, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import { Button, Panel } from '@/components/ui'
import { legalMoveStyles, nextSelectedSquare } from '@/lib/legalMoves'
import { playUci } from '@/lib/puzzles/normalize'
import type { PracticePuzzle } from '@/lib/puzzles/types'
import { MOTIF_LABEL, PHASE_LABEL } from '@/lib/stats'

type BoardState = {
  index: number
  ply: number
  fen: string
  failed: boolean
  solved: boolean
  selectedSquare: string | null
  score: { correct: number; total: number }
}

type BoardAction =
  | { type: 'reset'; fen: string }
  | { type: 'select'; square: string | null }
  | { type: 'fail' }
  | { type: 'progress'; fen: string; ply: number; solved: boolean }
  | { type: 'next'; index: number; fen: string }

function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'reset':
      return {
        ...state,
        fen: action.fen,
        ply: 0,
        failed: false,
        solved: false,
        selectedSquare: null,
      }
    case 'select':
      return { ...state, selectedSquare: action.square }
    case 'fail':
      return {
        ...state,
        failed: true,
        selectedSquare: null,
        score: { ...state.score, total: state.score.total + 1 },
      }
    case 'progress':
      return {
        ...state,
        fen: action.fen,
        ply: action.ply,
        solved: action.solved,
        selectedSquare: null,
        score: action.solved
          ? { correct: state.score.correct + 1, total: state.score.total + 1 }
          : state.score,
      }
    case 'next':
      return {
        ...state,
        index: action.index,
        fen: action.fen,
        ply: 0,
        failed: false,
        solved: false,
        selectedSquare: null,
      }
    default:
      return state
  }
}

function initialBoard(puzzles: PracticePuzzle[]): BoardState {
  return {
    index: 0,
    ply: 0,
    fen: puzzles[0]?.fen ?? '',
    failed: false,
    solved: false,
    selectedSquare: null,
    score: { correct: 0, total: 0 },
  }
}

export function PuzzleBoard({ puzzles }: { puzzles: PracticePuzzle[] }) {
  const [state, dispatch] = useReducer(boardReducer, puzzles, initialBoard)
  const { index, ply, fen, failed, solved, selectedSquare, score } = state

  const puzzle = puzzles[index]
  const sideToMove = fen.split(' ')[1] === 'b' ? 'Black' : 'White'
  const orientation = (puzzle?.color ?? 'white') === 'black' ? 'black' : 'white'

  if (!puzzle) {
    return <p className="text-sm text-muted">No puzzles match these filters yet.</p>
  }

  function makeMove(sourceSquare: string, targetSquare: string | null) {
    if (!targetSquare || failed || solved) return false
    const expected = puzzle.solution[ply]
    if (!expected) return false

    const board = new Chess(fen)
    let attempt
    try {
      attempt = board.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })
    } catch {
      return false
    }
    if (!attempt) return false

    const attemptUci = `${attempt.from}${attempt.to}${attempt.promotion ?? ''}`

    if (attemptUci !== expected) {
      dispatch({ type: 'fail' })
      return true
    }

    let nextPly = ply + 1
    let nextFen = board.fen()

    if (nextPly < puzzle.solution.length) {
      const reply = puzzle.solution[nextPly]!
      if (playUci(board, reply)) {
        nextPly += 1
        nextFen = board.fen()
      }
    }

    const done = nextPly >= puzzle.solution.length
    dispatch({ type: 'progress', fen: nextFen, ply: nextPly, solved: done })
    return true
  }

  function onSquareClick(square: string) {
    if (failed || solved) return
    const next = nextSelectedSquare(fen, selectedSquare, square)
    if (next.action === 'select') {
      dispatch({ type: 'select', square: next.square })
      return
    }
    makeMove(next.from, next.to)
  }

  function next() {
    const nextIndex = (index + 1) % puzzles.length
    const nextPuzzle = puzzles[nextIndex]!
    dispatch({ type: 'next', index: nextIndex, fen: nextPuzzle.fen })
  }

  function retry() {
    dispatch({ type: 'reset', fen: puzzle.fen })
  }

  const squareStyles: Record<string, CSSProperties> =
    failed || solved ? {} : legalMoveStyles(fen, selectedSquare)

  if (failed) {
    const expected = puzzle.solution[ply]
    if (expected && expected.length >= 4) {
      squareStyles[expected.slice(0, 2)] = { backgroundColor: 'rgba(56, 161, 105, 0.45)' }
      squareStyles[expected.slice(2, 4)] = { backgroundColor: 'rgba(56, 161, 105, 0.45)' }
    }
  }

  return (
    <div className="grid h-[calc(100dvh-8.5rem)] min-h-[24rem] gap-3 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-4">
      <div className="flex min-h-0 min-w-0 flex-col border border-line bg-surface">
        <div className="shrink-0 border-b border-line px-3 py-1.5 font-mono text-sm font-medium">
          {sideToMove} to move
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center p-2">
            <div className="aspect-square h-auto max-h-full w-full max-w-[min(100%,calc(100dvh-7rem))]">
              <Chessboard
              options={{
                position: fen,
                boardOrientation: orientation,
                allowDragging: !failed && !solved,
                onPieceDrag: ({ square }) => {
                  if (square && !failed && !solved) dispatch({ type: 'select', square })
                },
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  makeMove(sourceSquare, targetSquare),
                onSquareClick: ({ square }) => onSquareClick(square),
                squareStyles,
                darkSquareStyle: { backgroundColor: '#3d4450' },
                lightSquareStyle: { backgroundColor: '#9aa0a8' },
                boardStyle: { width: '100%', height: '100%' },
              }}
            />
            </div>
        </div>
      </div>
      <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto lg:max-h-full">
        <Panel className="shrink-0">
          <div className="flex items-center justify-between gap-3 font-mono text-xs uppercase tracking-wider text-muted">
            <span>Session</span>
            <span>
              Puzzle {index + 1} of {puzzles.length}
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl tabular">
            {score.correct}/{score.total}
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              Puzzle rating
            </div>
            <div className="mt-1 font-mono text-3xl tabular tracking-tight">
              {puzzle.rating != null ? puzzle.rating : '—'}
            </div>
            <div className="mt-1 text-sm text-muted">
              {puzzle.source === 'lichess' ? 'Lichess' : 'Chess.com'}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs text-muted">
            <span className="border border-line px-2 py-1">{PHASE_LABEL[puzzle.phase]}</span>
            {puzzle.motif ? (
              <span className="border border-line px-2 py-1">{MOTIF_LABEL[puzzle.motif]}</span>
            ) : null}
            <span className="border border-line px-2 py-1">{puzzle.color}</span>
          </div>
          <a
            href={puzzle.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-xs text-muted hover:text-ink"
          >
            Open source puzzle
          </a>
        </Panel>
        <Panel className="shrink-0 text-sm">
          {!failed && !solved ? (
            <p className="text-muted">Find the tactic. Opponent replies play automatically.</p>
          ) : null}
          {failed ? (
            <p className="text-blunder">Not the solution line. Highlighted is the key move.</p>
          ) : null}
          {solved ? <p className="text-ink">Solved.</p> : null}
        </Panel>
        <div className="mt-auto grid shrink-0 grid-cols-2 gap-2">
          <Button variant="ghost" onClick={retry}>
            Try again
          </Button>
          <Button onClick={next} disabled={puzzles.length < 2}>
            Next puzzle
          </Button>
        </div>
      </aside>
    </div>
  )
}
