import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { BOOK_MAX_MOVE, isBookMove } from './openingBook'

describe('opening book classification', () => {
  it('recognizes moves in a standard Ruy Lopez sequence', () => {
    const board = new Chess()
    for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']) {
      const moveNumber = Number(board.fen().split(' ')[5])
      board.move(san)
      expect(isBookMove(board.fen(), moveNumber)).toBe(true)
    }
  })

  it('never marks moves after the configured opening window', () => {
    const board = new Chess()
    board.move('e4')
    expect(isBookMove(board.fen(), BOOK_MAX_MOVE + 1)).toBe(false)
  })
})
