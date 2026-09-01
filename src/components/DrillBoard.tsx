import { Chess } from 'chess.js'
import { useState, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import { EnginePanel, ExploreActions } from '@/components/EnginePanel'
import { productBoardStyles } from '@/lib/boardTheme'
import { ClassificationBadge } from '@/components/ClassificationBadge'
import { PlaySplit } from '@/components/FittedBoardFrame'
import { Button, Panel } from '@/components/ui'
import type { Classification, Motif, Phase } from '@/lib/analysis/types'
import { useExploreLine } from '@/lib/analysis/useExploreLine'
import { useLiveEngine } from '@/lib/analysis/useLiveEngine'
import { legalMoveStyles, nextSelectedSquare } from '@/lib/legalMoves'
import {
  attemptMatchesEngine,
  DRILL_ANALYSIS_BUDGET,
  loadDrillEval,
  type DrillEngineEval,
} from '@/lib/practice/drillEval'
import { useDrillPrefetch } from '@/lib/practice/useDrillPrefetch'
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
  equalSans: string[]
}

function uniqueSans(evaluation: DrillEngineEval) {
  const seen = new Set<string>()
  const sans: string[] = []
  for (const move of evaluation.equals) {
    if (seen.has(move.san)) continue
    seen.add(move.san)
    sans.push(move.san)
  }
  return sans
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
  const [engineOn, setEngineOn] = useState(true)
  const [analysisRoot, setAnalysisRoot] = useState<string | null>(null)
  const fens = positions.map((row) => row.fen_before)
  const prefetch = useDrillPrefetch(fens, index)

  const position = positions[index]
  const analyzing = Boolean(reveal) && !thinking
  const explore = useExploreLine(analysisRoot ?? position?.fen_before ?? '', analyzing)
  const engine = useLiveEngine(analyzing ? explore.fen : null, analyzing && engineOn)
  const drillActivity = position
    ? (position.motif && MOTIF_LABEL[position.motif as Motif]) ||
      PHASE_LABEL[position.phase as Phase] ||
      position.classification
    : undefined
  useSessionTitle({ page: 'Drill', library: username, activity: drillActivity })
  const adhoc = !position || position.id.startsWith('adhoc') || !position.san
  const displayFen = analyzing ? explore.fen : fen
  const sideToMove = displayFen.split(' ')[1] === 'b' ? 'Black' : 'White'
  const orientation = sideToMove === 'Black' ? 'black' : 'white'

  if (!position) {
    return <p className="text-sm text-muted">No positions in this set.</p>
  }

  function makeMove(sourceSquare: string, targetSquare: string | null) {
    if (analyzing) return explore.play(sourceSquare, targetSquare)
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
    setAnalysisRoot(board.fen())
    setThinking(true)
    void revealAttempt(attempt.san, attempt.lan)
    return true
  }

  function onSquareClick(square: string) {
    if (thinking && !analyzing) return
    if (analyzing) {
      const next = explore.onSquareClick(selectedSquare, square)
      setSelectedSquare(next.selected)
      return
    }
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
      const evaluation = await loadDrillEval(position.fen_before)
      if (!evaluation) {
        setReveal({
          attemptSan,
          bestSan: '—',
          matchedBest: false,
          matchedHistorical: attemptSan === position.san,
          equalSans: [],
        })
        setScore((s) => ({ correct: s.correct, total: s.total + 1 }))
        return
      }
      const matchedBest = attemptMatchesEngine(evaluation, attemptSan, attemptLan)
      const matchedHistorical = attemptSan === position.san
      const equalSans = uniqueSans(evaluation)
      setReveal({
        attemptSan,
        bestSan: evaluation.best.san,
        matchedBest,
        matchedHistorical,
        equalSans,
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
    setAnalysisRoot(null)
  }

  function retry() {
    setFen(position.fen_before)
    setReveal(null)
    setSelectedSquare(null)
    setAnalysisRoot(null)
  }

  const squareStyles: Record<string, CSSProperties> = legalMoveStyles(
    displayFen,
    selectedSquare,
  )
  const last = explore.line.at(-1)
  if (last) {
    squareStyles[last.from] = { backgroundColor: 'rgba(232, 197, 71, 0.35)' }
    squareStyles[last.to] = { backgroundColor: 'rgba(232, 197, 71, 0.5)' }
  }
  if (reveal && !explore.exploring) {
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
            position: displayFen,
            boardOrientation: orientation,
            allowDragging: analyzing || (!reveal && !thinking),
            onPieceDrag: ({ square }) => {
              if (square && (analyzing || (!reveal && !thinking))) setSelectedSquare(square)
            },
            onPieceDrop: ({ sourceSquare, targetSquare }) =>
              makeMove(sourceSquare, targetSquare),
            onSquareClick: ({ square }) => onSquareClick(square),
            squareStyles,
            arrows: analyzing && engine.arrows.length ? engine.arrows : undefined,
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
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            Depth {DRILL_ANALYSIS_BUDGET.value}
            {prefetch.ahead > 1
              ? ` · ${prefetch.ready}/${prefetch.ahead} warmed`
              : prefetch.currentReady
                ? ' · ready'
                : ' · warming'}
          </p>
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
          {thinking ? (
            <p className="font-mono text-xs text-muted">
              Engine at depth {DRILL_ANALYSIS_BUDGET.value}…
            </p>
          ) : null}
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
              {reveal.equalSans.length > 1 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Engine-equal</dt>
                  <dd className="text-ink">{reveal.equalSans.join(' · ')}</dd>
                </div>
              ) : null}
              {adhoc ? null : (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">In that game</dt>
                  <dd className="text-blunder-text">{position.san}</dd>
                </div>
              )}
              <div className="pt-2 text-pretty text-ink">
                {reveal.matchedBest && reveal.attemptSan !== reveal.bestSan
                  ? `This try is engine-equal (${reveal.attemptSan}). Principal line is ${reveal.bestSan}${adhoc ? '.' : `. In the game you played ${position.san}.`}`
                  : adhoc
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
          {analyzing ? (
            <div className="mt-3 space-y-3 border-t border-line pt-3">
              <p className="text-sm text-ink">Play on from this position. Engine arrows are analysis, not the drill score.</p>
              <EnginePanel engine={engine} enabled={engineOn} onEnabledChange={setEngineOn} />
              <ExploreActions
                canUndo={explore.exploring}
                onUndo={explore.undo}
                onReset={explore.reset}
              />
            </div>
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
