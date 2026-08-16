import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { classifyOpeningFamily } from './families'
import {
  matchPawnStructure,
  pawnOnlyFen,
  pawnStructureKey,
  PAWN_STRUCTURES,
  STRUCTURE_DRILLS,
  structureDisplayFen,
  structureFromOpening,
  structureLeaks,
} from './structures'

function fenAfter(sans: string[]) {
  const board = new Chess()
  for (const san of sans) board.move(san)
  return board.fen()
}

function withNoise(fen: string, extra: string[]) {
  const board = new Chess(fen)
  for (const san of extra) board.move(san)
  return board.fen()
}

describe('opening families', () => {
  it('classifies catalog ECO codes', () => {
    expect(classifyOpeningFamily('C50', 'Italian Game, Giuoco Piano')).toBe('open_game')
    expect(classifyOpeningFamily('C57', 'Italian Game, Fried Liver Attack')).toBe('open_game')
    expect(classifyOpeningFamily('D35', "Queen's Gambit Declined, Exchange (Carlsbad)")).toBe(
      'closed_game',
    )
    expect(classifyOpeningFamily('D27', "Queen's Gambit Accepted, Classical")).toBe('closed_game')
    expect(classifyOpeningFamily('B90', 'Sicilian Najdorf')).toBe('semi_open')
    expect(classifyOpeningFamily('E97', "King's Indian")).toBe('semi_closed')
    expect(classifyOpeningFamily('A30', 'English, Hedgehog')).toBe('flank')
  })
})

describe('pawn structure keys', () => {
  it('strips pieces and hashes only pawns', () => {
    const carlsbad = structureDisplayFen(PAWN_STRUCTURES[0]!)
    const key = pawnStructureKey(carlsbad)
    expect(key.startsWith('w:')).toBe(true)
    expect(key).toContain('|b:')
    expect(key).not.toContain('N')
    expect(pawnStructureKey(carlsbad)).toBe(key)
  })

  it('builds a pawn-only FEN the board can render', () => {
    const carlsbad = structureDisplayFen(PAWN_STRUCTURES[0]!)
    const stripped = pawnOnlyFen(carlsbad)
    const [placement] = stripped.split(' ')
    expect(placement).toMatch(/^[Pp1-8/]+$/)
    expect(matchPawnStructure(stripped)).toBe('carlsbad')
  })

  it('matches each catalog skeleton from its own line', () => {
    for (const structure of PAWN_STRUCTURES) {
      expect(matchPawnStructure(structureDisplayFen(structure)), structure.id).toBe(structure.id)
    }
  })

  it('still matches Carlsbad after wing-pawn noise', () => {
    const quiet = fenAfter([
      'd4',
      'd5',
      'c4',
      'e6',
      'Nc3',
      'Nf6',
      'cxd5',
      'exd5',
      'Bg5',
      'Be7',
      'e3',
      'O-O',
      'Bd3',
      'Nbd7',
      'Qc2',
      'c6',
    ])
    const noisy = withNoise(quiet, ['h3', 'h6', 'a3', 'a6'])
    expect(matchPawnStructure(quiet)).toBe('carlsbad')
    expect(matchPawnStructure(noisy)).toBe('carlsbad')
    expect(pawnStructureKey(quiet)).not.toBe(pawnStructureKey(noisy))
  })

  it('does not call a generic Italian a Carlsbad', () => {
    const italian = fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'])
    expect(matchPawnStructure(italian)).not.toBe('carlsbad')
  })

  it('maps opening names when games have no FEN', () => {
    expect(structureFromOpening("Queen's Gambit Declined: Exchange Variation", 'D35')).toBe(
      'carlsbad',
    )
    expect(structureFromOpening('Sicilian Defense: Accelerated Dragon, Maroczy Bind', 'B36')).toBe(
      'maroczy',
    )
    expect(structureFromOpening('Sicilian Defense: Old Sicilian', 'B30')).toBeNull()
    expect(structureFromOpening('Sicilian Defense: Scheveningen', 'B80')).toBe(
      'sicilian_scheveningen',
    )
  })

  it('counts leaks from pawn-stripped positions, not phase labels', () => {
    const carlsbadFen = structureDisplayFen(PAWN_STRUCTURES.find((row) => row.id === 'carlsbad')!)
    const rows = structureLeaks(
      [
        {
          opening_name: "Queen's Gambit Declined Exchange",
          opening_eco: 'D35',
          result: 'loss',
        },
        {
          opening_name: "Queen's Gambit Declined Exchange",
          opening_eco: 'D35',
          result: 'win',
        },
      ],
      [
        { fen_before: carlsbadFen, phase: 'middlegame' },
        { fen_before: carlsbadFen, phase: 'opening' },
        { fen_before: fenAfter(['e4', 'e5']), phase: 'middlegame' },
      ],
    )
    const carlsbad = rows.find((row) => row.id === 'carlsbad')
    expect(carlsbad).toMatchObject({ games: 2, wins: 1, leaks: 2 })
  })
})

describe('structure drills', () => {
  it('uses legal positions', () => {
    for (const drill of STRUCTURE_DRILLS) {
      expect(() => new Chess(drill.fen), drill.id).not.toThrow()
      expect(drill.breakChoices).toContain(drill.correctBreak)
    }
  })
})
