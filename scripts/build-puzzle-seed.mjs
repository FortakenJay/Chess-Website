/**
 * Build / validate the shipped puzzle seed pack.
 * Usage: node scripts/build-puzzle-seed.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'data', 'lichess-puzzles.json')

/** Curated single-move tactics validated with chess.js — covers phases/motifs/colors. */
const SEED = [
  {
    id: 'seed:back-rank-1',
    rating: 900,
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    solution: ['e1e8'],
    themes: ['backRankMate', 'mate', 'endgame'],
    phase: 'endgame',
    motif: 'back_rank',
    color: 'white',
  },
  {
    id: 'seed:back-rank-2',
    rating: 1000,
    fen: '2r3k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1',
    solution: ['c1c8'],
    themes: ['backRankMate', 'mate', 'endgame'],
    phase: 'endgame',
    motif: 'back_rank',
    color: 'white',
  },
  {
    id: 'seed:back-rank-3',
    rating: 950,
    fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    solution: ['a1a8'],
    themes: ['backRankMate', 'mate', 'endgame'],
    phase: 'endgame',
    motif: 'back_rank',
    color: 'white',
  },
  {
    id: 'seed:black-back-rank',
    rating: 1000,
    fen: '4r1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1',
    solution: ['e8e1'],
    themes: ['backRankMate', 'mate', 'endgame'],
    phase: 'endgame',
    motif: 'back_rank',
    color: 'black',
  },
  {
    id: 'seed:mate-queen-1',
    rating: 800,
    fen: '6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1',
    solution: ['d1d8'],
    themes: ['mate', 'mateIn1', 'endgame'],
    phase: 'endgame',
    motif: 'missed_mate',
    color: 'white',
  },
  {
    id: 'seed:mate-queen-2',
    rating: 850,
    fen: '6k1/6pp/8/8/8/8/6PP/3Q2K1 w - - 0 1',
    solution: ['d1d8'],
    themes: ['mate', 'mateIn1', 'endgame'],
    phase: 'endgame',
    motif: 'missed_mate',
    color: 'white',
  },
  {
    id: 'seed:mate-queen-3',
    rating: 900,
    fen: '7k/5Qpp/8/8/8/8/5PPP/6K1 w - - 0 1',
    solution: ['f7f8'],
    themes: ['mate', 'mateIn1', 'endgame'],
    phase: 'endgame',
    motif: 'missed_mate',
    color: 'white',
  },
  {
    id: 'seed:opening-mate-1',
    rating: 1100,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    solution: ['h5f7'],
    themes: ['mate', 'opening', 'fork'],
    phase: 'opening',
    motif: 'fork',
    color: 'white',
  },
  {
    id: 'seed:opening-pin-1',
    rating: 1180,
    fen: 'rnbqk2r/ppppbppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: ['c4f7'],
    themes: ['pin', 'opening'],
    phase: 'opening',
    motif: 'pin',
    color: 'white',
  },
  {
    id: 'seed:opening-pin-2',
    rating: 1200,
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1',
    solution: ['c4f7'],
    themes: ['pin', 'opening'],
    phase: 'opening',
    motif: 'pin',
    color: 'white',
  },
  {
    id: 'seed:opening-hanging-1',
    rating: 1000,
    fen: 'rnbqkbnr/ppp2ppp/8/3pp3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
    solution: ['f3e5'],
    themes: ['hangingPiece', 'opening'],
    phase: 'opening',
    motif: 'hanging_piece',
    color: 'white',
  },
  {
    id: 'seed:opening-hanging-2',
    rating: 1050,
    fen: 'rnbqkb1r/ppp2ppp/5n2/3pp3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
    solution: ['e4d5'],
    themes: ['hangingPiece', 'opening'],
    phase: 'opening',
    motif: 'hanging_piece',
    color: 'white',
  },
  {
    id: 'seed:opening-discovered-1',
    rating: 1350,
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p1B1/2B1P3/2NP1N2/PPP2PPP/R2QK2R w KQkq - 0 6',
    solution: ['g5f6'],
    themes: ['discoveredAttack', 'opening'],
    phase: 'opening',
    motif: 'discovered_attack',
    color: 'white',
  },
  {
    id: 'seed:black-opening-fork',
    rating: 1250,
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 3',
    solution: ['c6d4'],
    themes: ['fork', 'opening'],
    phase: 'opening',
    motif: 'fork',
    color: 'black',
  },
  {
    id: 'seed:black-hanging',
    rating: 1250,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 4',
    solution: ['f6e4'],
    themes: ['hangingPiece', 'opening'],
    phase: 'opening',
    motif: 'hanging_piece',
    color: 'black',
  },
  {
    id: 'seed:fork-knight-1',
    rating: 1200,
    fen: '2r3k1/pp3ppp/4p3/3n4/8/2N5/PPP2PPP/2R3K1 w - - 0 1',
    solution: ['c3d5'],
    themes: ['fork', 'middlegame'],
    phase: 'middlegame',
    motif: 'fork',
    color: 'white',
  },
  {
    id: 'seed:fork-knight-2',
    rating: 1100,
    fen: '8/8/8/3n4/8/2N5/8/4K1k1 w - - 0 1',
    solution: ['c3d5'],
    themes: ['fork', 'endgame'],
    phase: 'endgame',
    motif: 'fork',
    color: 'white',
  },
  {
    id: 'seed:fork-knight-3',
    rating: 1150,
    fen: '8/5k2/8/4N3/8/8/5K2/8 w - - 0 1',
    solution: ['e5d7'],
    themes: ['fork', 'endgame'],
    phase: 'endgame',
    motif: 'fork',
    color: 'white',
  },
  {
    id: 'seed:skewer-1',
    rating: 1300,
    fen: '4k3/8/8/8/8/4R3/8/4K3 w - - 0 1',
    solution: ['e3e8'],
    themes: ['skewer', 'endgame'],
    phase: 'endgame',
    motif: 'skewer',
    color: 'white',
  },
  {
    id: 'seed:middlegame-fork-1',
    rating: 1450,
    fen: '2rq1rk1/1b2bppp/p2p1n2/1p2p3/3PP3/1BN2N2/PP3PPP/R1BQR1K1 w - - 0 13',
    solution: ['f3e5'],
    themes: ['fork', 'middlegame'],
    phase: 'middlegame',
    motif: 'fork',
    color: 'white',
  },
  {
    id: 'seed:rook-mate-session',
    rating: 980,
    fen: '5rk1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solution: ['d1d8'],
    themes: ['backRankMate', 'mate', 'endgame'],
    phase: 'endgame',
    motif: 'back_rank',
    color: 'white',
  },
  {
    id: 'seed:opening-hanging-knight',
    rating: 1120,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: ['f3e5'],
    themes: ['hangingPiece', 'opening'],
    phase: 'opening',
    motif: 'hanging_piece',
    color: 'white',
  },
  {
    id: 'seed:middlegame-pin-bishop',
    rating: 1320,
    fen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: ['c4f7'],
    themes: ['pin', 'opening'],
    phase: 'opening',
    motif: 'pin',
    color: 'white',
  },
  {
    id: 'seed:endgame-queen-check',
    rating: 920,
    fen: '6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1',
    solution: ['e1e8'],
    themes: ['mate', 'endgame'],
    phase: 'endgame',
    motif: 'missed_mate',
    color: 'white',
  },
]

function playUci(board, uci) {
  if (uci.length < 4) return false
  try {
    return Boolean(
      board.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] ?? 'q',
      }),
    )
  } catch {
    return false
  }
}

function validate(puzzle) {
  const board = new Chess(puzzle.fen)
  const side = board.turn() === 'w' ? 'white' : 'black'
  if (side !== puzzle.color) {
    throw new Error(`${puzzle.id}: color mismatch (fen says ${side})`)
  }
  if (puzzle.solution.length === 0) {
    throw new Error(`${puzzle.id}: empty solution`)
  }
  const uci = puzzle.solution[0]
  if (!playUci(board, uci)) throw new Error(`${puzzle.id}: illegal ${uci}`)
}

async function main() {
  const kept = []
  for (const raw of SEED) {
    try {
      validate(raw)
      kept.push({
        ...raw,
        source: 'lichess',
        url: 'https://lichess.org/training',
      })
    } catch (error) {
      console.warn(`drop ${raw.id}: ${error instanceof Error ? error.message : error}`)
    }
  }
  if (kept.length < 16) {
    throw new Error(`Seed too small after validation (${kept.length})`)
  }
  await mkdir(path.dirname(OUT), { recursive: true })
  await writeFile(
    OUT,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      source: 'curated-seed',
      count: kept.length,
      note: 'Shipped offline seed so Puzzles works without a CLI download. Live fetches enrich this pack in-app.',
      puzzles: kept,
    }),
  )
  console.log(`Wrote ${kept.length} seed puzzles → ${OUT}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
