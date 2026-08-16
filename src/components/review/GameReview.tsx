import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { ButtonLink } from '@/components/ui'
import type { AnalyzedPly, EngineLine, GameAnalysis, MoveQuality } from '@/lib/analysis/types'
import {
  coachCopy,
  evalBarWhitePct,
  formatEval,
  QUALITY_COLOR,
  QUALITY_LABEL,
} from '@/lib/analysis/formatEval'
import { evaluateLines } from '@/lib/analyzeClient'
import { FittedBoardFrame } from '@/components/FittedBoardFrame'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { ReviewInsights } from '@/components/review/ReviewInsights'
import { ReviewReport } from '@/components/review/ReviewReport'
import {
  btnNav,
  btnNavStrong,
  btnPrimary,
  chipActive,
  chipIdle,
  moveActive,
  moveIdle,
} from '@/components/review/reviewUi'
import { cn } from '@/lib/cn'
import { legalMoveStyles, nextSelectedSquare } from '@/lib/legalMoves'
import { usePlayerAvatar } from '@/lib/usePlayerAvatar'
import { productBoardStyles } from '@/lib/boardTheme'
import { humanOpeningLabel } from '@/lib/openings/nicknames'
import { useSessionTitle } from '@/lib/useDocumentTitle'

type ExploreMove = {
  san: string
  from: string
  to: string
  fenAfter: string
}

type ReviewTab = 'report' | 'analysis' | 'insights'

function qualityClass(quality: MoveQuality | null | undefined) {
  if (!quality) return 'text-muted'
  if (quality === 'blunder') return 'text-blunder-text'
  if (quality === 'mistake') return 'text-mistake'
  if (quality === 'inaccuracy') return 'text-inaccuracy'
  if (quality === 'miss') return 'text-quality-miss'
  if (quality === 'brilliant') return 'text-quality-brilliant'
  if (quality === 'great' || quality === 'best' || quality === 'excellent') {
    return 'text-quality-great'
  }
  if (quality === 'book') return 'text-quality-book'
  return 'text-ink'
}

function formatLineMoves(line: EngineLine, maxMoves = 8): string {
  const sans = line.pvSan.length ? line.pvSan : line.pvUci
  return sans.slice(0, maxMoves).join(' ')
}

function isLeakPly(ply: AnalyzedPly) {
  return (
    ply.isUserMove &&
    (ply.quality === 'inaccuracy' ||
      ply.quality === 'mistake' ||
      ply.quality === 'blunder' ||
      ply.quality === 'miss')
  )
}

function curveIndexFromClick(el: HTMLElement, clientX: number, count: number) {
  const rect = el.getBoundingClientRect()
  const t = (clientX - rect.left) / Math.max(1, rect.width)
  return Math.max(0, Math.min(count - 1, Math.round(t * (count - 1))))
}

function EvalGraph({
  curve,
  plies,
  cursor,
  onSelect,
}: {
  curve: number[]
  plies: AnalyzedPly[]
  cursor: number
  onSelect: (index: number) => void
}) {
  if (curve.length < 2) return null
  const w = 320
  const h = 72
  const last = curve.length - 1
  const maxAbs = Math.max(200, ...curve.map((cp) => Math.min(800, Math.abs(cp))))
  const points = curve
    .map((cp, i) => {
      const x = (i / last) * w
      const y = h / 2 - (Math.max(-maxAbs, Math.min(maxAbs, cp)) / maxAbs) * (h / 2 - 4)
      return `${x},${y}`
    })
    .join(' ')
  const leaks = plies.filter(isLeakPly)

  return (
    <div className="border-t border-line bg-surface-2 px-2 py-2">
      <div className="relative">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="block w-full"
          role="img"
          aria-label="Evaluation graph"
        >
          <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="currentColor" className="text-line" strokeWidth="1" />
          <polyline fill="none" stroke="var(--chart-primary)" strokeWidth="2" points={points} />
          {leaks.map((ply) => {
            const x = ((ply.ply + 1) / last) * w
            const y = h / 2 - (Math.max(-maxAbs, Math.min(maxAbs, ply.evalCp)) / maxAbs) * (h / 2 - 4)
            return <circle key={ply.ply} cx={x} cy={y} r="4.5" fill={QUALITY_COLOR[ply.quality!]} />
          })}
          <line
            x1={(cursor / last) * w}
            y1="0"
            x2={(cursor / last) * w}
            y2={h}
            stroke="var(--chart-secondary)"
            strokeWidth="1.5"
          />
        </svg>
        <button
          type="button"
          className="quiet absolute inset-0"
          aria-label="Jump to move on the graph"
          onClick={(event) => {
            onSelect(curveIndexFromClick(event.currentTarget, event.clientX, curve.length))
          }}
        />
        {leaks.map((ply) => {
          const xPct = ((ply.ply + 1) / last) * 100
          const y =
            h / 2 -
            (Math.max(-maxAbs, Math.min(maxAbs, ply.evalCp)) / maxAbs) * (h / 2 - 4)
          const yPct = (y / h) * 100
          return (
            <button
              key={ply.ply}
              type="button"
              className="quiet absolute z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
              aria-label={`Go to ${ply.san}`}
              onClick={() => onSelect(ply.ply + 1)}
            />
          )
        })}
      </div>
    </div>
  )
}

function AnalysisPanel({ analysis }: { analysis: GameAnalysis }) {
  const plies = analysis.plies ?? []
  const evalCurve = analysis.evalCurve ?? [0]
  const youAvatar = usePlayerAvatar(analysis.username)
  const oppAvatar = usePlayerAvatar(analysis.opponent)
  const [cursor, setCursor] = useState(0)
  const [showBest, setShowBest] = useState(false)
  const [activeLine, setActiveLine] = useState(0)
  const [engineLines, setEngineLines] = useState<EngineLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)
  const [engineEnabled, setEngineEnabled] = useState(true)
  const [engineTime, setEngineTime] = useState(280)
  const [engineMultiPv, setEngineMultiPv] = useState(3)
  const [explore, setExplore] = useState<ExploreMove[]>([])
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)

  const currentPly = cursor === 0 ? null : plies[cursor - 1] ?? null
  const gameFen = currentPly?.fenAfter ?? plies[0]?.fenBefore ?? undefined
  const fen = explore.at(-1)?.fenAfter ?? gameFen
  const exploring = explore.length > 0
  const orientation = analysis.color === 'black' ? 'black' : 'white'

  const topLine = engineLines[0]
  const displayEval = topLine
    ? formatEval(topLine.cp, topLine.mate)
    : formatEval(currentPly?.evalCp ?? evalCurve[0] ?? 0, currentPly?.mate ?? null)
  const barPct = evalBarWhitePct(topLine?.cp ?? currentPly?.evalCp ?? evalCurve[0] ?? 0)

  const coach = useMemo(() => {
    if (exploring) {
      const last = explore.at(-1)!
      return {
        title: `You played ${last.san}`,
        body: 'Engine is scoring this line. Undo or drill the position on the board.',
      }
    }
    if (!currentPly?.isUserMove) {
      return {
        title: analysis.openingName
          ? `${currentPly?.san ?? 'Start'} · ${analysis.openingName}`
          : currentPly
            ? `${currentPly.san}`
            : 'Starting position',
        body: currentPly?.isUserMove === false
          ? 'Opponent move. Play a move on the board to try a different line.'
          : 'Play a move on the board, or step through the game.',
      }
    }
    return coachCopy(currentPly.quality, currentPly.san)
  }, [analysis.openingName, currentPly, explore, exploring])

  const lastMoveStyles = useMemo(() => {
    const last = explore.at(-1)
    if (last) {
      return {
        [last.from]: { backgroundColor: 'rgba(232, 197, 71, 0.35)' },
        [last.to]: { backgroundColor: 'rgba(232, 197, 71, 0.5)' },
      } satisfies Record<string, CSSProperties>
    }
    if (!currentPly) return {}
    return {
      [currentPly.from]: { backgroundColor: 'rgba(232, 197, 71, 0.35)' },
      [currentPly.to]: { backgroundColor: 'rgba(232, 197, 71, 0.5)' },
    } satisfies Record<string, CSSProperties>
  }, [currentPly, explore])

  const arrowStyles = useMemo(() => {
    if (!showBest) return undefined
    const line = engineLines[activeLine] ?? engineLines[0]
    const bestUci = line?.bestMove ?? currentPly?.bestUci
    if (!bestUci || bestUci.length < 4) return undefined
    const colors = [
      'rgba(129, 182, 76, 0.9)',
      'rgba(149, 183, 118, 0.75)',
      'rgba(107, 110, 118, 0.7)',
    ]
    return [
      {
        startSquare: bestUci.slice(0, 2),
        endSquare: bestUci.slice(2, 4),
        color: colors[activeLine] ?? colors[0]!,
      },
    ]
  }, [showBest, engineLines, activeLine, currentPly?.bestUci])

  useEffect(() => {
    setShowBest(false)
    setActiveLine(0)
    setEngineLines([])
    setExplore([])
    setSelectedSquare(null)
  }, [cursor])

  function playExploreMove(sourceSquare: string, targetSquare: string | null) {
    if (!fen || !targetSquare) return false
    const board = new Chess(fen)
    if (board.isGameOver()) return false
    const move = board.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    })
    if (!move) return false
    setSelectedSquare(null)
    setExplore((line) => [
      ...line,
      { san: move.san, from: move.from, to: move.to, fenAfter: board.fen() },
    ])
    return true
  }

  function onSquareClick(square: string) {
    if (!fen) return
    const next = nextSelectedSquare(fen, selectedSquare, square)
    if (next.action === 'select') {
      setSelectedSquare(next.square)
      return
    }
    playExploreMove(next.from, next.to)
  }

  function stepBack() {
    if (explore.length) {
      setExplore((line) => line.slice(0, -1))
      setSelectedSquare(null)
      return
    }
    setCursor((c) => Math.max(0, c - 1))
  }

  function stepForward() {
    if (explore.length) {
      setExplore([])
      setSelectedSquare(null)
    }
    setCursor((c) => Math.min(evalCurve.length - 1, c + 1))
  }

  useEffect(() => {
    if (!fen || !engineEnabled) {
      setLinesLoading(false)
      setEngineLines([])
      setShowBest(false)
      return
    }
    let cancelled = false
    setLinesLoading(true)
    const handle = window.setTimeout(() => {
      void evaluateLines(fen, engineTime, engineMultiPv)
        .then((lines) => {
          if (cancelled) return
          setEngineLines(lines.slice(0, engineMultiPv))
          setShowBest(true)
        })
        .catch(() => {
          if (!cancelled) setEngineLines([])
        })
        .finally(() => {
          if (!cancelled) setLinesLoading(false)
        })
    }, 120)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [engineEnabled, engineMultiPv, engineTime, fen])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        stepBack()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        stepForward()
      } else if (event.key === 'Home') {
        setExplore([])
        setSelectedSquare(null)
        setCursor(0)
      } else if (event.key === 'End') {
        setExplore([])
        setSelectedSquare(null)
        setCursor(evalCurve.length - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [evalCurve.length, explore.length])

  const pairs: Array<{ moveNumber: number; white?: AnalyzedPly; black?: AnalyzedPly }> = []
  for (const ply of plies) {
    let pair = pairs.find((p) => p.moveNumber === ply.moveNumber)
    if (!pair) {
      pair = { moveNumber: ply.moveNumber }
      pairs.push(pair)
    }
    if (ply.color === 'white') pair.white = ply
    else pair.black = ply
  }

  const firstMistake = plies.find(
    (p) =>
      p.isUserMove && (p.quality === 'mistake' || p.quality === 'blunder' || p.quality === 'inaccuracy'),
  )

  useEffect(() => {
    if (firstMistake) setCursor(firstMistake.ply + 1)
    // Only on mount for this analysis
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.gameLink])

  return (
    <div className="grid min-h-0 gap-3 lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] lg:overflow-hidden">
      <section className="flex flex-col border border-line bg-surface lg:min-h-0">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-3 py-2 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <PlayerAvatar username={analysis.opponent} src={oppAvatar} size={28} />
            <div className="min-w-0">
              <p className="truncate font-medium" translate="no">
                {analysis.opponent}
              </p>
              <p className="font-mono text-xs text-muted">{analysis.opponentRating ?? '—'}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2">
            <div className="min-w-0 text-right">
              <p className="truncate font-medium" translate="no">
                {analysis.username}
              </p>
              <p className="font-mono text-xs text-muted">{analysis.userRating ?? '—'}</p>
            </div>
            <PlayerAvatar username={analysis.username} src={youAvatar} size={28} />
          </div>
        </div>

        <div className="relative aspect-square w-full lg:aspect-auto lg:min-h-0 lg:flex-1">
          <div className="absolute inset-0 flex items-stretch gap-2 p-2 sm:p-3">
          <div
            className="relative flex w-4 shrink-0 flex-col-reverse overflow-hidden border border-line bg-ink sm:w-5"
            title={`Eval ${displayEval}`}
            aria-label={`Evaluation ${displayEval}`}
          >
            <div className="w-full bg-canvas" style={{ height: `${100 - barPct}%` }} />
            <span className="pointer-events-none absolute inset-x-0 top-1 text-center font-mono text-[9px] text-muted">
              {displayEval}
            </span>
          </div>
          <FittedBoardFrame>
            <Chessboard
              options={{
                position: fen,
                boardOrientation: orientation,
                allowDragging: Boolean(fen),
                onPieceDrag: ({ square }) => {
                  if (square) setSelectedSquare(square)
                },
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  playExploreMove(sourceSquare, targetSquare),
                onSquareClick: ({ square }) => onSquareClick(square),
                squareStyles: {
                  ...lastMoveStyles,
                  ...(fen ? legalMoveStyles(fen, selectedSquare) : {}),
                },
                arrows: arrowStyles,
                ...productBoardStyles,
                boardStyle: { width: '100%', height: '100%' },
              }}
            />
          </FittedBoardFrame>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-t border-line px-2 py-2">
          <button
            type="button"
            className={cn(btnNav, 'inline-flex min-h-11 min-w-11 items-center justify-center font-mono text-xs')}
            onClick={() => setCursor(0)}
            aria-label="Start"
          >
            ≪
          </button>
          <button
            type="button"
            className={cn(btnNav, 'inline-flex min-h-11 min-w-11 items-center justify-center font-mono text-xs')}
            onClick={stepBack}
            aria-label="Previous move"
          >
            ‹
          </button>
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto px-1">
            {plies.map((ply) => {
              const selected = cursor === ply.ply + 1
              return (
                <button
                  key={ply.ply}
                  type="button"
                  onClick={() => setCursor(ply.ply + 1)}
                  className={cn(
                    'inline-flex min-h-11 shrink-0 items-center px-2.5 font-mono text-xs',
                    selected ? moveActive : moveIdle,
                    !selected && ply.isUserMove && qualityClass(ply.quality),
                    !selected && !ply.isUserMove && 'text-muted',
                  )}
                >
                  {ply.color === 'white' ? `${ply.moveNumber}.` : ''}
                  {ply.san}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className={cn(btnNav, 'inline-flex min-h-11 min-w-11 items-center justify-center font-mono text-xs')}
            onClick={stepForward}
            aria-label="Next move"
          >
            ›
          </button>
          <button
            type="button"
            className={cn(btnNav, 'inline-flex min-h-11 min-w-11 items-center justify-center font-mono text-xs')}
            onClick={() => setCursor(evalCurve.length - 1)}
            aria-label="End"
          >
            ≫
          </button>
        </div>
      </section>

      <section className="flex min-h-[22rem] flex-col overflow-y-auto overscroll-contain border border-line bg-surface lg:min-h-0">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <p className={cn('text-base font-medium', qualityClass(currentPly?.quality))}>{coach.title}</p>
            <p className="mt-1 text-sm text-muted">{coach.body}</p>
            {exploring ? (
              <p className="mt-2 font-mono text-xs text-muted">
                Line {explore.map((move) => move.san).join(' ')}
              </p>
            ) : currentPly?.isUserMove && currentPly.bestSan && currentPly.quality !== 'best' ? (
              <p className="mt-2 font-mono text-xs text-accent">Best was {currentPly.bestSan}</p>
            ) : null}
          </div>
          <span className="shrink-0 border border-line bg-surface-2 px-2 py-1 font-mono text-sm tabular">
            {displayEval}
          </span>
        </div>

        <div className="shrink-0 space-y-2 border-b border-line px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                {engineEnabled ? `Top ${engineMultiPv} ${engineMultiPv === 1 ? 'line' : 'lines'}` : 'Engine paused'}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted">
                Acc {Math.round(analysis.accuracyPct)}% · ACPL {analysis.acpl}
              </p>
            </div>
            <button
              type="button"
              aria-pressed={engineEnabled}
              onClick={() => setEngineEnabled((enabled) => !enabled)}
              className={cn(
                'inline-flex min-h-11 items-center border px-3 font-mono text-xs',
                engineEnabled ? chipActive : chipIdle,
              )}
            >
              Engine {engineEnabled ? 'on' : 'off'}
            </button>
          </div>
          <details className="border border-line bg-canvas">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 font-mono text-xs text-muted marker:content-none [&::-webkit-details-marker]:hidden">
              Engine settings
              <span aria-hidden>+</span>
            </summary>
            <div className="grid grid-cols-2 gap-3 border-t border-line p-3">
              <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-muted">
                Search
                <select
                  value={engineTime}
                  onChange={(event) => setEngineTime(Number(event.target.value))}
                  className="min-h-11 border border-line bg-canvas px-3 text-base text-ink sm:text-xs"
                >
                  <option value={120}>Fast</option>
                  <option value={280}>Balanced</option>
                  <option value={700}>Deep</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-muted">
                Lines
                <select
                  value={engineMultiPv}
                  onChange={(event) => setEngineMultiPv(Number(event.target.value))}
                  className="min-h-11 border border-line bg-canvas px-3 text-base text-ink sm:text-xs"
                >
                  {[1, 2, 3, 4, 5].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>
          {!engineEnabled ? (
            <p className="py-2 text-sm text-muted">
              Engine is off. Browsing and move playback still work.
            </p>
          ) : null}
          {linesLoading && engineLines.length === 0 ? (
            <p className="font-mono text-xs text-muted">Calculating…</p>
          ) : null}
          <ul className="space-y-1.5">
            {engineLines.map((line, index) => (
              <li key={line.multipv}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveLine(index)
                    setShowBest(true)
                  }}
                  className={cn(
                    'grid min-h-11 w-full grid-cols-[3rem_minmax(0,1fr)] items-center gap-2 border px-2 py-2 text-left font-mono text-xs',
                    activeLine === index && showBest
                      ? 'border-bone bg-surface-2 text-ink hover:bg-surface-2'
                      : 'quiet border-line text-ink hover:bg-surface-2',
                  )}
                >
                  <span className="tabular text-muted">{formatEval(line.cp, line.mate)}</span>
                  <span className="truncate text-ink">{formatLineMoves(line)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            {engineEnabled ? (
              <button
                type="button"
                disabled={engineLines.length === 0}
                onClick={() => setShowBest((v) => !v)}
                className={cn(btnPrimary, 'w-full min-h-11 px-3 text-sm')}
              >
                {showBest ? 'Hide arrow' : 'See best move'}
              </button>
            ) : null}
            {exploring ? (
              <button
                type="button"
                onClick={() => {
                  setExplore([])
                  setSelectedSquare(null)
                }}
                className={cn(btnNav, 'w-full min-h-11 px-3 text-sm')}
              >
                Back to game
              </button>
            ) : null}
            {fen ? (
              <ButtonLink
                to="/drill/$username"
                params={{ username: analysis.username }}
                search={{ fen }}
                className="w-full"
              >
                Drill this
              </ButtonLink>
            ) : null}
          </div>
        </div>

        <div className="min-h-[12rem] shrink-0 px-2 py-3">
          <h3 className="mb-2 px-1 font-mono text-[11px] uppercase tracking-wider text-muted">
            Game moves
          </h3>
          <ol className="space-y-0.5 font-mono text-sm">
            {pairs.map((pair) => (
              <li key={pair.moveNumber} className="grid grid-cols-[2rem_1fr_1fr] gap-1">
                <span className="text-muted">{pair.moveNumber}.</span>
                {[pair.white, pair.black].map((ply, idx) =>
                  ply ? (
                    <button
                      key={`${ply.ply}-${idx}`}
                      type="button"
                      onClick={() => setCursor(ply.ply + 1)}
                      className={cn(
                        'min-h-11 px-2 text-left',
                        cursor === ply.ply + 1 ? moveActive : moveIdle,
                        cursor !== ply.ply + 1 && ply.isUserMove && qualityClass(ply.quality),
                        cursor !== ply.ply + 1 && !ply.isUserMove && 'text-ink',
                      )}
                    >
                      {ply.san}
                      {ply.isUserMove && ply.quality === 'brilliant' ? (
                        <span className="ml-1 text-[10px] opacity-90">!!</span>
                      ) : ply.quality &&
                        ply.quality !== 'brilliant' &&
                        ply.quality !== 'best' &&
                        ply.quality !== 'excellent' ? (
                        <span className="ml-1 text-[10px] opacity-80">
                          {QUALITY_LABEL[ply.quality].slice(0, 1)}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    <span key={idx} />
                  ),
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className="shrink-0">
          <EvalGraph curve={evalCurve} plies={plies} cursor={cursor} onSelect={setCursor} />

          <div className="sticky bottom-0 z-10 flex gap-2 border-t border-line bg-surface p-2 sm:p-3">
            <button
              type="button"
              className={cn(btnNav, 'min-h-11 flex-1 font-mono text-sm')}
              onClick={() => setCursor(0)}
            >
              ≪
            </button>
            <button
              type="button"
              className={cn(btnNavStrong, 'min-h-11 flex-1 font-mono text-sm')}
              onClick={stepBack}
            >
              ‹
            </button>
            <button
              type="button"
              className={cn(btnNav, 'min-h-11 flex-1 font-mono text-sm')}
              onClick={stepForward}
            >
              ›
            </button>
            <button
              type="button"
              className={cn(btnNav, 'min-h-11 flex-1 font-mono text-sm')}
              onClick={() => setCursor(evalCurve.length - 1)}
            >
              ≫
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export function GameReview({
  analysis,
  onBack,
}: {
  analysis: GameAnalysis
  onBack: () => void
}) {
  const [tab, setTab] = useState<ReviewTab>('report')
  const opening = analysis.openingName
    ? humanOpeningLabel(analysis.openingName, analysis.openingEco).title
    : analysis.opponent
      ? `vs ${analysis.opponent}`
      : undefined
  useSessionTitle({
    page: 'Review',
    library: analysis.username,
    activity: opening,
  })

  const tabs: Array<{ id: ReviewTab; label: string }> = [
    { id: 'report', label: 'Report' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'insights', label: 'Insights' },
  ]

  return (
    <div className="flex flex-col lg:min-h-0 lg:flex-1">
      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="quiet inline-flex min-h-11 items-center px-3 font-mono text-xs text-muted hover:bg-surface-2 hover:text-ink"
        >
          ← Games
        </button>
        <p className="truncate font-mono text-xs text-muted">
          {analysis.openingName ?? analysis.openingEco ?? 'Game review'}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Review sections"
        className="mb-3 flex shrink-0 flex-wrap gap-2 border-b border-line pb-2"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              'inline-flex min-h-11 items-center px-4 font-mono text-xs uppercase tracking-wider',
              tab === item.id ? chipActive : chipIdle,
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        {tab === 'report' ? (
          <div className="lg:h-full lg:overflow-y-auto lg:overscroll-contain">
            <ReviewReport analysis={analysis} onStartReview={() => setTab('analysis')} />
          </div>
        ) : null}
        {tab === 'analysis' ? <AnalysisPanel analysis={analysis} /> : null}
        {tab === 'insights' ? (
          <div className="lg:h-full lg:overflow-y-auto lg:overscroll-contain">
            <ReviewInsights analysis={analysis} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
