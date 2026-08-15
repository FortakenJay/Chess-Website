import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
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
import { usePlayerAvatar } from '@/lib/usePlayerAvatar'

type ReviewTab = 'report' | 'analysis' | 'insights'

function qualityClass(quality: MoveQuality | null | undefined) {
  if (!quality) return 'text-muted'
  if (quality === 'blunder') return 'text-blunder'
  if (quality === 'mistake') return 'text-mistake'
  if (quality === 'inaccuracy') return 'text-inaccuracy'
  if (quality === 'miss') return 'text-blunder'
  if (quality === 'brilliant') return 'text-[#1baca6]'
  if (quality === 'great' || quality === 'best' || quality === 'excellent') {
    return 'text-[#81b64c]'
  }
  if (quality === 'book') return 'text-[#a78bfa]'
  return 'text-ink'
}

function formatLineMoves(line: EngineLine, maxMoves = 8): string {
  const sans = line.pvSan.length ? line.pvSan : line.pvUci
  return sans.slice(0, maxMoves).join(' ')
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
  const maxAbs = Math.max(200, ...curve.map((v) => Math.min(800, Math.abs(v))))
  const points = curve
    .map((cp, i) => {
      const x = (i / (curve.length - 1)) * w
      const y = h / 2 - (Math.max(-maxAbs, Math.min(maxAbs, cp)) / maxAbs) * (h / 2 - 4)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="relative border-t border-line bg-surface-2 px-2 py-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" role="img" aria-label="Evaluation graph">
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="currentColor" className="text-line" strokeWidth="1" />
        <polyline fill="none" stroke="#ececec" strokeWidth="1.5" points={points} />
        {plies.map((ply) => {
          if (!ply.isUserMove || !ply.quality) return null
          if (
            ply.quality === 'brilliant' ||
            ply.quality === 'great' ||
            ply.quality === 'book' ||
            ply.quality === 'best' ||
            ply.quality === 'excellent' ||
            ply.quality === 'good'
          ) return null
          const x = ((ply.ply + 1) / (curve.length - 1)) * w
          const y = h / 2 - (Math.max(-maxAbs, Math.min(maxAbs, ply.evalCp)) / maxAbs) * (h / 2 - 4)
          const fill = QUALITY_COLOR[ply.quality]
          return <circle key={ply.ply} cx={x} cy={y} r="3.5" fill={fill} />
        })}
        <line
          x1={(cursor / Math.max(1, curve.length - 1)) * w}
          y1="0"
          x2={(cursor / Math.max(1, curve.length - 1)) * w}
          y2={h}
          stroke="#e8c547"
          strokeWidth="1.5"
        />
      </svg>
      <div className="absolute inset-0 flex">
        {curve.map((_, i) => (
          <button
            key={i}
            type="button"
            className="quiet h-full flex-1 hover:bg-ink/10"
            aria-label={`Go to ply ${i}`}
            onClick={() => onSelect(i)}
          />
        ))}
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

  const currentPly = cursor === 0 ? null : plies[cursor - 1] ?? null
  const fen = currentPly?.fenAfter ?? plies[0]?.fenBefore ?? undefined
  const orientation = analysis.color === 'black' ? 'black' : 'white'

  const topLine = engineLines[0]
  const displayEval = topLine
    ? formatEval(topLine.cp, topLine.mate)
    : formatEval(currentPly?.evalCp ?? evalCurve[0] ?? 0, currentPly?.mate ?? null)
  const barPct = evalBarWhitePct(topLine?.cp ?? currentPly?.evalCp ?? evalCurve[0] ?? 0)

  const coach = useMemo(() => {
    if (!currentPly?.isUserMove) {
      return {
        title: analysis.openingName
          ? `${currentPly?.san ?? 'Start'} · ${analysis.openingName}`
          : currentPly
            ? `${currentPly.san}`
            : 'Starting position',
        body: currentPly?.isUserMove === false ? 'Opponent move.' : 'Browse moves or open the engine line.',
      }
    }
    return coachCopy(currentPly.quality, currentPly.san)
  }, [analysis.openingName, currentPly])

  const lastMoveStyles = useMemo(() => {
    if (!currentPly) return {}
    return {
      [currentPly.from]: { backgroundColor: 'rgba(232, 197, 71, 0.35)' },
      [currentPly.to]: { backgroundColor: 'rgba(232, 197, 71, 0.5)' },
    } satisfies Record<string, CSSProperties>
  }, [currentPly])

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
  }, [cursor])

  useEffect(() => {
    if (!fen) return
    let cancelled = false
    setLinesLoading(true)
    const handle = window.setTimeout(() => {
      void evaluateLines(fen, 280, 3)
        .then((lines) => {
          if (cancelled) return
          setEngineLines(lines.slice(0, 3))
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
  }, [fen])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setCursor((c) => Math.max(0, c - 1))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setCursor((c) => Math.min(evalCurve.length - 1, c + 1))
      } else if (event.key === 'Home') {
        setCursor(0)
      } else if (event.key === 'End') {
        setCursor(evalCurve.length - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [evalCurve.length])

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
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] lg:overflow-hidden">
      <section className="flex min-h-[min(70vw,28rem)] flex-col border border-line bg-surface lg:min-h-0">
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

        <div className="flex min-h-0 flex-1 items-stretch gap-2 p-2 sm:p-3">
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
                allowDragging: false,
                squareStyles: lastMoveStyles,
                arrows: arrowStyles,
                darkSquareStyle: { backgroundColor: '#3d4450' },
                lightSquareStyle: { backgroundColor: '#9aa0a8' },
                boardStyle: { width: '100%', height: '100%' },
              }}
            />
          </FittedBoardFrame>
        </div>

        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-t border-line px-2 py-2">
          <button
            type="button"
            className={cn(btnNav, 'px-2 py-1 font-mono text-xs')}
            onClick={() => setCursor(0)}
            aria-label="Start"
          >
            ≪
          </button>
          <button
            type="button"
            className={cn(btnNav, 'px-2 py-1 font-mono text-xs')}
            onClick={() => setCursor((c) => Math.max(0, c - 1))}
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
                    'shrink-0 px-1.5 py-1 font-mono text-xs',
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
            className={cn(btnNav, 'px-2 py-1 font-mono text-xs')}
            onClick={() => setCursor((c) => Math.min(evalCurve.length - 1, c + 1))}
            aria-label="Next move"
          >
            ›
          </button>
          <button
            type="button"
            className={cn(btnNav, 'px-2 py-1 font-mono text-xs')}
            onClick={() => setCursor(evalCurve.length - 1)}
            aria-label="End"
          >
            ≫
          </button>
        </div>
      </section>

      <section className="flex min-h-[22rem] flex-col overflow-hidden border border-line bg-surface lg:min-h-0">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <p className={cn('text-base font-medium', qualityClass(currentPly?.quality))}>{coach.title}</p>
            <p className="mt-1 text-sm text-muted">{coach.body}</p>
            {currentPly?.isUserMove && currentPly.bestSan && currentPly.quality !== 'best' ? (
              <p className="mt-2 font-mono text-xs text-[#81b64c]">Best was {currentPly.bestSan}</p>
            ) : null}
          </div>
          <span className="shrink-0 border border-line bg-surface-2 px-2 py-1 font-mono text-sm tabular">
            {displayEval}
          </span>
        </div>

        <div className="shrink-0 space-y-2 border-b border-line px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">Top 3 lines</p>
            <span className="font-mono text-[11px] text-muted">
              Acc {Math.round(analysis.accuracyPct)}% · ACPL {analysis.acpl}
            </span>
          </div>
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
                    'grid w-full grid-cols-[3rem_minmax(0,1fr)] gap-2 border px-2 py-1.5 text-left font-mono text-xs',
                    activeLine === index && showBest
                      ? 'border-[#e8c547] bg-surface-2 text-ink hover:bg-surface-2'
                      : 'quiet border-line text-ink hover:bg-surface-2',
                  )}
                >
                  <span className="tabular text-muted">{formatEval(line.cp, line.mate)}</span>
                  <span className="truncate text-ink">{formatLineMoves(line)}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setShowBest((v) => !v)}
            className={cn(btnPrimary, 'w-full px-3 py-2 text-sm')}
          >
            {showBest ? 'Hide arrow' : 'See best move'}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
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
                        'px-1.5 py-0.5 text-left',
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

          <div className="flex gap-2 border-t border-line p-2 sm:p-3">
            <button
              type="button"
              className={cn(btnNav, 'flex-1 py-2 font-mono text-sm')}
              onClick={() => setCursor(0)}
            >
              ≪
            </button>
            <button
              type="button"
              className={cn(btnNavStrong, 'flex-1 py-2 font-mono text-sm')}
              onClick={() => setCursor((c) => Math.max(0, c - 1))}
            >
              ‹
            </button>
            <button
              type="button"
              className={cn(btnNav, 'flex-1 py-2 font-mono text-sm')}
              onClick={() => setCursor((c) => Math.min(evalCurve.length - 1, c + 1))}
            >
              ›
            </button>
            <button
              type="button"
              className={cn(btnNav, 'flex-1 py-2 font-mono text-sm')}
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

  const tabs: Array<{ id: ReviewTab; label: string }> = [
    { id: 'report', label: 'Report' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'insights', label: 'Insights' },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="quiet px-2 py-1 font-mono text-xs text-muted hover:bg-surface-2 hover:text-ink"
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
              'px-4 py-2 font-mono text-xs uppercase tracking-wider',
              tab === item.id ? chipActive : chipIdle,
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'report' ? (
          <div className="h-full overflow-y-auto overscroll-contain">
            <ReviewReport analysis={analysis} onStartReview={() => setTab('analysis')} />
          </div>
        ) : null}
        {tab === 'analysis' ? <AnalysisPanel analysis={analysis} /> : null}
        {tab === 'insights' ? (
          <div className="h-full overflow-y-auto overscroll-contain">
            <ReviewInsights analysis={analysis} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
