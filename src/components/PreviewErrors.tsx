import { Chess } from 'chess.js'
import { useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { ClassificationBadge } from '@/components/ClassificationBadge'
import type { FlaggedPosition } from '@/lib/analysis/types'
import { legalMovesFrom, legalMoveStyles } from '@/lib/legalMoves'
import { PREVIEW_BEST_MOVES } from '@/lib/previewAnswers'
import { MOTIF_LABEL, PHASE_LABEL } from '@/lib/stats'

export type PreviewPosition = FlaggedPosition & { id: string }

type Reveal = {
  attemptSan: string
  bestSan: string
  matchedBest: boolean
  repeatedMistake: boolean
}

function bestMoveSan(fen: string, uci: string) {
  try {
    const board = new Chess(fen)
    const move = board.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] ?? 'q',
    })
    return move?.san ?? uci
  } catch {
    return uci
  }
}

export function PreviewErrors({ rows }: { rows: PreviewPosition[] }) {
  const sorted = useMemo(() => [...rows].sort((a, b) => b.loss - a.loss), [rows])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = sorted.find((row) => row.id === selectedId) ?? sorted[0] ?? null
  const [fen, setFen] = useState(() => sorted[0]?.fenBefore ?? '')
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const sideToMove = selected?.fenBefore.split(' ')[1] === 'b' ? 'Black' : 'White'

  if (sorted.length === 0) {
    return <p className="text-sm text-muted">No engine-flagged mistakes in this game.</p>
  }

  function selectPosition(position: PreviewPosition) {
    setSelectedId(position.id)
    setFen(position.fenBefore)
    setReveal(null)
    setSelectedSquare(null)
  }

  function nextPosition() {
    if (!selected) return
    const index = sorted.findIndex((position) => position.id === selected.id)
    selectPosition(sorted[(index + 1) % sorted.length]!)
  }

  function makeMove(sourceSquare: string, targetSquare: string | null) {
    if (!selected || !targetSquare || reveal) return false
    const board = new Chess(selected.fenBefore)
    const attempt = board.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    })
    if (!attempt) return false

    const bestMove = PREVIEW_BEST_MOVES[selected.id] ?? ''
    const matchedBest = attempt.lan === bestMove
    setSelectedSquare(null)
    setFen(board.fen())
    setReveal({
      attemptSan: attempt.san,
      bestSan: bestMoveSan(selected.fenBefore, bestMove),
      matchedBest,
      repeatedMistake: attempt.san === selected.san,
    })
    setScore((current) => ({
      correct: current.correct + (matchedBest ? 1 : 0),
      total: current.total + 1,
    }))
    return true
  }

  function onSquareClick(square: string) {
    if (!selected || reveal) return
    if (selectedSquare && makeMove(selectedSquare, square)) return
    setSelectedSquare(
      legalMovesFrom(selected.fenBefore, square).length > 0 ? square : null,
    )
  }

  function retry() {
    if (!selected) return
    setFen(selected.fenBefore)
    setReveal(null)
    setSelectedSquare(null)
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(240px,380px)_minmax(0,1fr)]">
      {selected ? (
        <figure className="border border-line bg-surface">
          <div className="border-b border-line px-3 py-2 font-mono text-sm font-medium">
            {sideToMove} to move
          </div>
          <div className="p-3">
            <Chessboard
              options={{
                position: fen,
                boardOrientation: sideToMove === 'Black' ? 'black' : 'white',
                allowDragging: !reveal,
                onPieceDrag: ({ square }) => {
                  if (square && !reveal) setSelectedSquare(square)
                },
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  makeMove(sourceSquare, targetSquare),
                onSquareClick: ({ square }) => onSquareClick(square),
                squareStyles: reveal
                  ? {}
                  : legalMoveStyles(selected.fenBefore, selectedSquare),
                darkSquareStyle: { backgroundColor: '#3d4450' },
                lightSquareStyle: { backgroundColor: '#9aa0a8' },
                boardStyle: { width: '100%' },
              }}
            />
          </div>
          <figcaption className="border-t border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <ClassificationBadge value={selected.classification} />
              <span className="font-mono text-xs text-muted">
                Move {selected.moveNumber}, {selected.color === 'white' ? 'White' : 'Black'} vs{' '}
                {selected.opponent}
              </span>
            </div>
            {!reveal ? (
              <p className="mt-3 text-sm text-muted">Play the move you would choose.</p>
            ) : (
              <dl className="mt-3 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">You played</dt>
                  <dd>{reveal.attemptSan}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Engine move</dt>
                  <dd className={reveal.matchedBest ? 'text-ink' : 'text-muted'}>
                    {reveal.bestSan}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Hikaru played</dt>
                  <dd className="text-blunder">{selected.san}</dd>
                </div>
                <p className="pt-2 text-ink">
                  {reveal.matchedBest
                    ? 'Correct. You matched the engine.'
                    : reveal.repeatedMistake
                      ? 'You repeated the game mistake.'
                      : 'Different move, but not the engine choice.'}
                </p>
              </dl>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <span className="font-mono text-xs text-muted">
                Score {score.correct}/{score.total}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={retry}
                  disabled={!reveal}
                  className="border border-line px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-40"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={nextPosition}
                  className="border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-canvas"
                >
                  Next error
                </button>
              </div>
            </div>
          </figcaption>
        </figure>
      ) : null}

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface-2 font-mono text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Opp</th>
              <th className="px-3 py-2">Mv</th>
              <th className="px-3 py-2">Phase</th>
              <th className="px-3 py-2">Motif</th>
              <th className="px-3 py-2">Loss</th>
              <th className="px-3 py-2">Played</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const active = selected?.id === row.id
              return (
                <tr
                  key={row.id}
                  tabIndex={0}
                  aria-selected={active}
                  className={`cursor-pointer border-t border-line hover:bg-surface-2 ${
                    active ? 'bg-surface-2' : ''
                  }`}
                  onClick={() => selectPosition(row)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectPosition(row)
                    }
                  }}
                >
                  <td className="px-3 py-2 font-mono text-xs">{row.playedOn}</td>
                  <td className="truncate px-3 py-2">{row.opponent}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.moveNumber}</td>
                  <td className="px-3 py-2">{PHASE_LABEL[row.phase]}</td>
                  <td className="px-3 py-2">{row.motif ? MOTIF_LABEL[row.motif] : ''}</td>
                  <td className="px-3 py-2">
                    <span className="mr-2 font-mono text-xs tabular">{row.loss}</span>
                    <ClassificationBadge value={row.classification} />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.san}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
