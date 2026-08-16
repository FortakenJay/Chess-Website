import { Chess } from 'chess.js'
import { useState, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import { productBoardStyles } from '@/lib/boardTheme'
import { ClassificationBadge } from '@/components/ClassificationBadge'
import { PlaySplit } from '@/components/FittedBoardFrame'
import { Button, Panel } from '@/components/ui'
import { evaluateFen } from '@/lib/analyzeClient'
import type { Classification, Motif, Phase } from '@/lib/analysis/types'
import { legalMoveStyles, nextSelectedSquare } from '@/lib/legalMoves'
import { MOTIF_LABEL, PHASE_LABEL } from '@/lib/stats'
import { useAuth } from '@/lib/auth'
import { useSessionTitle } from '@/lib/useDocumentTitle'
import { getBrowserClient } from '@/lib/supabase/browser'
import type { Tables } from '@/lib/supabase/database.types'

type Reveal = {
  attemptSan: string
  bestSan: string
  matchedBest: boolean
  matchedHistorical: boolean
}

export function DrillBoard({
  username,
  positions,
}: {
  username: string
  positions: Tables<'flagged_positions'>[]
}) {
  const { profile } = useAuth()
  const owner = profile?.chess_com_username === username.toLowerCase()
  const [index, setIndex] = useState(0)
  const [fen, setFen] = useState(positions[0]?.fen_before ?? '')
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [thinking, setThinking] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)

  const position = positions[index]
  const drillActivity = position
    ? (position.motif && MOTIF_LABEL[position.motif as Motif]) ||
      PHASE_LABEL[position.phase as Phase] ||
      position.classification
    : undefined
  useSessionTitle({ page: 'Drill', library: username, activity: drillActivity })
  const adhoc = !position || position.id.startsWith('adhoc') || !position.san
  const sideToMove = position?.fen_before.split(' ')[1] === 'b' ? 'Black' : 'White'
  const orientation = sideToMove === 'Black' ? 'black' : 'white'

  if (!position) {
    return <p className="text-sm text-muted">No positions in this set.</p>
  }

  function makeMove(sourceSquare: string, targetSquare: string | null) {
    if (!targetSquare || reveal || thinking) return false
    const board = new Chess(position.fen_before)
    const attempt = board.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    })
    if (!attempt) return false
    setSelectedSquare(null)
    setFen(board.fen())
    setThinking(true)
    void revealAttempt(attempt.san, attempt.lan)
    return true
  }

  function onSquareClick(square: string) {
    if (reveal || thinking) return
    const next = nextSelectedSquare(position.fen_before, selectedSquare, square)
    if (next.action === 'select') {
      setSelectedSquare(next.square)
      return
    }
    makeMove(next.from, next.to)
  }

  async function revealAttempt(attemptSan: string, attemptLan: string) {
    try {
      const evalResult = await evaluateFen(position.fen_before)
      const probe = new Chess(position.fen_before)
      let bestSan = evalResult.bestMove
      try {
        const played = probe.move({
          from: evalResult.bestMove.slice(0, 2),
          to: evalResult.bestMove.slice(2, 4),
          promotion: evalResult.bestMove[4] ?? 'q',
        })
        if (played) bestSan = played.san
      } catch {
        /* keep uci */
      }
      const matchedBest = attemptSan === bestSan || attemptLan === evalResult.bestMove
      const matchedHistorical = attemptSan === position.san
      setReveal({
        attemptSan,
        bestSan,
        matchedBest,
        matchedHistorical,
      })
      setScore((s) => ({
        correct: s.correct + (matchedBest ? 1 : 0),
        total: s.total + 1,
      }))
      if (owner && position.id && !position.id.startsWith('adhoc')) {
        await getBrowserClient().from('drill_attempts').insert({
          username,
          position_id: position.id,
          matched_best: matchedBest,
          matched_historical_mistake: matchedHistorical,
        })
      }
    } finally {
      setThinking(false)
    }
  }

  function next() {
    const nextIndex = (index + 1) % positions.length
    const nextPos = positions[nextIndex]!
    setIndex(nextIndex)
    setFen(nextPos.fen_before)
    setReveal(null)
    setSelectedSquare(null)
  }

  function retry() {
    setFen(position.fen_before)
    setReveal(null)
    setSelectedSquare(null)
  }

  const squareStyles: Record<string, CSSProperties> =
    reveal || thinking ? {} : legalMoveStyles(position.fen_before, selectedSquare)
  if (reveal) {
    try {
      const hist = new Chess(position.fen_before)
      const played = hist.move(position.san)
      if (played) {
        squareStyles[played.from] = { backgroundColor: 'rgba(229, 72, 77, 0.45)' }
        squareStyles[played.to] = { backgroundColor: 'rgba(229, 72, 77, 0.45)' }
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <PlaySplit
      panelWidth="narrow"
      boardLabel={<>{sideToMove} to move</>}
      board={
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            allowDragging: !reveal && !thinking,
            onPieceDrag: ({ square }) => {
              if (square && !reveal && !thinking) setSelectedSquare(square)
            },
            onPieceDrop: ({ sourceSquare, targetSquare }) =>
              makeMove(sourceSquare, targetSquare),
            onSquareClick: ({ square }) => onSquareClick(square),
            squareStyles,
            ...productBoardStyles,
            boardStyle: { width: '100%', height: '100%' },
          }}
        />
      }
      panel={
        <>
        <Panel className="shrink-0" padding="md">
          <div className="flex items-center justify-between gap-3 font-mono text-xs uppercase tracking-wider text-muted">
            <span>Session</span>
            <span>
              Position {index + 1} of {positions.length}
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl tabular">
            {score.correct}/{score.total}
          </div>
          {adhoc ? (
            <p className="mt-4 text-sm text-muted">Position from analysis. Find the engine move.</p>
          ) : (
            <>
              <div className="mt-4 text-sm text-muted">
                {position.played_on} · {position.color} vs {position.opponent} · move{' '}
                {position.move_number}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <ClassificationBadge value={position.classification as Exclude<Classification, 'fine'>} />
                <span className="font-mono text-xs text-muted">
                  {PHASE_LABEL[position.phase as keyof typeof PHASE_LABEL]}
                </span>
                {position.motif ? (
                  <span className="font-mono text-xs text-muted">
                    {MOTIF_LABEL[position.motif as keyof typeof MOTIF_LABEL]}
                  </span>
                ) : null}
              </div>
            </>
          )}
        </Panel>
        <Panel className="shrink-0 text-sm" padding="md">
          {!reveal && !thinking ? (
            <p className="text-muted">Play a move. Nothing is shown until you do.</p>
          ) : null}
          {thinking ? <p className="font-mono text-xs text-muted">Engine…</p> : null}
          {reveal ? (
            <dl className="space-y-2 font-mono text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">This try</dt>
                <dd className={reveal.matchedBest ? 'text-accent' : 'text-ink'}>
                  {reveal.attemptSan}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Best move</dt>
                <dd className="text-accent">{reveal.bestSan}</dd>
              </div>
              {adhoc ? null : (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">In that game</dt>
                  <dd className="text-blunder-text">{position.san}</dd>
                </div>
              )}
              <div className="pt-2 text-pretty text-ink">
                {adhoc
                  ? reveal.matchedBest
                    ? 'This try matches the engine.'
                    : `The engine wanted ${reveal.bestSan}.`
                  : reveal.matchedBest
                    ? reveal.matchedHistorical
                      ? 'This try matches the engine — and it is also what you played in the game.'
                      : `This try matches the engine. In the game you played ${position.san}.`
                    : reveal.matchedHistorical
                      ? `This try repeats the game move. The engine wanted ${reveal.bestSan}.`
                      : `This try is neither the engine move (${reveal.bestSan}) nor the game move (${position.san}).`}
              </div>
            </dl>
          ) : null}
        </Panel>
        <div className="mt-auto grid shrink-0 grid-cols-2 gap-2">
          <Button variant="ghost" className="w-full" onClick={retry} disabled={!reveal}>
            Try again
          </Button>
          <Button className="w-full" onClick={next} disabled={!reveal || positions.length < 2}>
            Next position
          </Button>
        </div>
        </>
      }
    />
  )
}
