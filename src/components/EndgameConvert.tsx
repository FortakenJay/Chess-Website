import { Chess } from 'chess.js'
import { useEffect, useState, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import { PlaySplit } from '@/components/FittedBoardFrame'
import { Button, Panel } from '@/components/ui'
import { ENGINE_DISPLAY_NAME } from '@/lib/analysis/engine'
import type { AnalysisBudget } from '@/lib/analysis/types'
import { productBoardStyles } from '@/lib/boardTheme'
import { legalMoveStyles, nextSelectedSquare } from '@/lib/legalMoves'
import { evaluateLines } from '@/lib/analyzeClient'
import { stmCp } from '@/lib/openings/humanPick'
import { isLegalStudyFen } from '@/lib/roadmap/study'

const HUMAN_LIKE_BUDGET: AnalysisBudget = { kind: 'depth', value: 10, multipv: 3 }
const HUMAN_LIKE_EQUAL = 40

function pickReply(fen: string, lines: { bestMove: string; cp: number; pvSan: string[] }[]) {
  if (lines.length === 0) return null
  const stm: 'w' | 'b' = fen.split(' ')[1] === 'b' ? 'b' : 'w'
  const top = lines[0]!
  const second = lines[1]
  if (
    second &&
    Math.abs(stmCp(top, stm) - stmCp(second, stm)) <= HUMAN_LIKE_EQUAL &&
    Math.random() < 0.35
  ) {
    return second.bestMove
  }
  return top.bestMove
}

function playUci(fen: string, uci: string) {
  const board = new Chess(fen)
  const move = board.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: (uci[4] as 'q' | 'r' | 'b' | 'n' | undefined) ?? 'q',
  })
  return move ? board.fen() : null
}

export function EndgameConvert({
  fen: startFen,
  title,
  onExit,
}: {
  fen: string
  title: string
  onExit: () => void
}) {
  const [fen, setFen] = useState(startFen)
  const [thinking, setThinking] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [status, setStatus] = useState('Play a converting move. The engine replies at club strength.')

  const side = fen.split(' ')[1] === 'b' ? 'black' : 'white'
  const legal = isLegalStudyFen(fen)

  useEffect(() => {
    setFen(startFen)
    setSelectedSquare(null)
    setThinking(false)
    setStatus('Play a converting move. The engine replies at club strength.')
  }, [startFen])

  async function engineReply(fromFen: string) {
    const board = new Chess(fromFen)
    if (board.isGameOver()) {
      setStatus(board.isCheckmate() ? 'Checkmate.' : 'Game over.')
      return
    }
    setThinking(true)
    try {
      const lines = await evaluateLines(fromFen, HUMAN_LIKE_BUDGET, 3)
      const uci = pickReply(fromFen, lines)
      const next = uci ? playUci(fromFen, uci) : null
      if (next) {
        setFen(next)
        const after = new Chess(next)
        setStatus(
          after.isGameOver()
            ? after.isCheckmate()
              ? 'The engine delivered mate.'
              : 'Drawn.'
            : `${ENGINE_DISPLAY_NAME} · depth ${HUMAN_LIKE_BUDGET.value} (human-like)`,
        )
      } else {
        setStatus('No legal engine reply.')
      }
    } catch {
      setStatus('Engine failed. Try again or reset.')
    } finally {
      setThinking(false)
    }
  }

  function makeMove(from: string, to: string | null) {
    if (!to || thinking || !legal) return false
    const board = new Chess(fen)
    const move = board.move({ from, to, promotion: 'q' })
    if (!move) return false
    setSelectedSquare(null)
    setFen(board.fen())
    void engineReply(board.fen())
    return true
  }

  function onSquareClick(square: string) {
    if (thinking) return
    const next = nextSelectedSquare(fen, selectedSquare, square)
    if (next.action === 'select') {
      setSelectedSquare(next.square)
      return
    }
    makeMove(next.from, next.to)
  }

  const squareStyles: Record<string, CSSProperties> = thinking
    ? {}
    : legalMoveStyles(fen, selectedSquare)

  return (
    <PlaySplit
      panelWidth="narrow"
      boardLabel={<>{side === 'black' ? 'Black' : 'White'} to move</>}
      board={
        <Chessboard
          options={{
            position: fen,
            boardOrientation: side,
            allowDragging: !thinking && legal,
            onPieceDrag: ({ square }) => {
              if (square && !thinking) setSelectedSquare(square)
            },
            onPieceDrop: ({ sourceSquare, targetSquare }) => makeMove(sourceSquare, targetSquare),
            onSquareClick: ({ square }) => onSquareClick(square),
            squareStyles,
            ...productBoardStyles,
            boardStyle: { width: '100%', height: '100%' },
          }}
        />
      }
      panel={
        <>
          <Panel padding="md">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{title}</p>
            <p className="mt-2 text-sm leading-6 text-ink">{status}</p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              {ENGINE_DISPLAY_NAME} · depth {HUMAN_LIKE_BUDGET.value} · not library analysis
            </p>
          </Panel>
          <div className="mt-auto grid shrink-0 grid-cols-2 gap-2">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setFen(startFen)
                setSelectedSquare(null)
                setThinking(false)
                setStatus('Play a converting move. The engine replies at club strength.')
              }}
            >
              Reset
            </Button>
            <Button variant="secondary" className="w-full" onClick={onExit}>
              Back
            </Button>
          </div>
        </>
      }
    />
  )
}
