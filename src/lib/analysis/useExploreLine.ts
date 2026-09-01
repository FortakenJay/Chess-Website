import { Chess } from 'chess.js'
import { useEffect, useState } from 'react'
import { nextSelectedSquare } from '@/lib/legalMoves'

export type ExplorePly = {
  san: string
  from: string
  to: string
  fenAfter: string
}

export function useExploreLine(rootFen: string, enabled: boolean) {
  const [line, setLine] = useState<ExplorePly[]>([])
  const fen = enabled ? (line.at(-1)?.fenAfter ?? rootFen) : rootFen

  useEffect(() => {
    setLine([])
  }, [rootFen, enabled])

  function play(from: string, to: string | null) {
    if (!enabled || !to) return false
    const board = new Chess(fen)
    if (board.isGameOver()) return false
    const move = board.move({ from, to, promotion: 'q' })
    if (!move) return false
    setLine((current) => [
      ...current,
      { san: move.san, from: move.from, to: move.to, fenAfter: board.fen() },
    ])
    return true
  }

  function onSquareClick(selected: string | null, square: string) {
    if (!enabled) return { selected, played: false as const }
    const next = nextSelectedSquare(fen, selected, square)
    if (next.action === 'select') return { selected: next.square, played: false as const }
    return { selected: null, played: play(next.from, next.to) }
  }

  function undo() {
    setLine((current) => current.slice(0, -1))
  }

  function reset() {
    setLine([])
  }

  return {
    fen,
    line,
    exploring: line.length > 0,
    play,
    onSquareClick,
    undo,
    reset,
  }
}
