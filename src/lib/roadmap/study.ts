import { Chess } from 'chess.js'
import { structureById, structureDisplayFen, type StructureId } from '@/lib/openings/structures'

export type RoadmapQuiz = {
  prompt: string
  choices: string[]
  answer: number
  why: string
}

export type RoadmapStudy = {
  fen: string
  extraFens?: string[]
  pawnsOnly?: boolean
  task: string
  quiz: RoadmapQuiz
  structure?: StructureId
}

function line(sans: string[]) {
  const board = new Chess()
  for (const san of sans) {
    const played = board.move(san)
    if (!played) throw new Error(`Illegal study line move ${san}`)
  }
  return board.fen()
}

function skeleton(id: StructureId) {
  return structureDisplayFen(structureById(id))
}

export const ROADMAP_STUDY: Record<string, RoadmapStudy> = {
  'open-center': {
    fen: line(['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4']),
    task: 'Open center (Scotch). Files are open. Develop, castle, occupy a file — do not spend five moves rerouting.',
    quiz: {
      prompt: 'What decides an open center?',
      choices: ['Slow piece rerouting', 'Time and king safety', 'A minority attack on the queenside'],
      answer: 1,
      why: 'Pawns are gone. Tactics come immediately. Time beats material.',
    },
  },
  'closed-center': {
    fen: skeleton('kid_closed'),
    pawnsOnly: true,
    structure: 'kid_closed',
    task: 'Closed KID. Chains point at the attack. White plays c5; Black plays …f5. Wrong wing loses the race.',
    quiz: {
      prompt: 'Where do you attack in a closed center?',
      choices: ['Always the kingside', 'Where your pawn chain points', 'The open files — there are none'],
      answer: 1,
      why: 'Locked chains freeze the center. Space is on the wing your pawns lean toward.',
    },
  },
  'fixed-center': {
    fen: skeleton('sicilian_scheveningen'),
    pawnsOnly: true,
    structure: 'sicilian_scheveningen',
    task: 'Sicilian with d6+e6. One pawn each, half-open files. A race: White on the king, Black on the c-file.',
    quiz: {
      prompt: 'What is the default job in a fixed / semi-open center?',
      choices: ['Squeeze and wait', 'Race down your file before they race down theirs', 'Trade into a king-and-pawn ending'],
      answer: 1,
      why: 'Both sides already have a file. The first break (e5 or …d5) usually wins the race.',
    },
  },
  'tense-center': {
    fen: skeleton('qgd_tense'),
    pawnsOnly: true,
    structure: 'qgd_tense',
    task: 'QGD before the capture. Pawns touching. Whoever takes first usually concedes a file or a square.',
    quiz: {
      prompt: 'When should you take on d5 or c4 in a tense center?',
      choices: ['Immediately, to simplify', 'When the capture improves your pieces', 'Never — tension is always better'],
      answer: 1,
      why: 'The first capture sets the rest of the game: Carlsbad, IQP, or hanging pawns.',
    },
  },
  outposts: {
    fen: line(['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'e6', 'e3', 'Bd6', 'Nbd2', 'O-O', 'Ne5']),
    task: 'Knight on e5. A hole is a square no pawn can kick. Knights live there.',
    quiz: {
      prompt: 'What makes e5 an outpost here?',
      choices: ['The knight is developed', 'No Black pawn can kick it', 'It attacks the queen'],
      answer: 1,
      why: 'Black’s f- and d-pawns cannot take e5. Structure decides which pieces are good.',
    },
  },
  breaks: {
    fen: skeleton('carlsbad'),
    pawnsOnly: true,
    structure: 'carlsbad',
    task: 'Carlsbad. White’s legal break is b4-b5. Black’s is …e5. Name the break before you play moves.',
    quiz: {
      prompt: 'White’s thematic break in the Carlsbad is…',
      choices: ['e4', 'b4-b5', 'f4-f5'],
      answer: 1,
      why: 'Minority attack. Make c6 and d5 weak, then sit on them.',
    },
  },
  trades: {
    fen: skeleton('iqp_white'),
    pawnsOnly: true,
    structure: 'iqp_white',
    task: 'Isolated queen pawn. Owner attacks now and keeps pieces. Defender trades toward the ending.',
    quiz: {
      prompt: 'You have the isolated d-pawn. Do you trade pieces?',
      choices: ['Yes — less to calculate', 'No — activity pays the rent on that pawn', 'Only the queens'],
      answer: 1,
      why: 'IQP is a middlegame asset and an endgame liability. If you own it, keep pieces on.',
    },
  },
  'king-pawn': {
    fen: '8/8/8/8/8/4k3/3PK3/8 w - - 0 1',
    extraFens: ['8/8/8/8/4P3/8/8/4K2k w - - 0 1'],
    task: 'King and pawn. Shoulder their king, or check whether they are inside the square of the pawn.',
    quiz: {
      prompt: 'If the defending king can step into the square of the pawn…',
      choices: ['The pawn still queens', 'The king catches the pawn', 'You need a rook'],
      answer: 1,
      why: 'Square of the pawn. A rook pawn is the exception — the corner often draws.',
    },
  },
  opposition: {
    fen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1',
    task: 'Take the opposition. Kings facing with one square between — the side that does not have to move takes the key squares.',
    quiz: {
      prompt: 'White to move. The move that takes the opposition is…',
      choices: ['e4, shoving the pawn', 'Ke4, facing their king', 'Ke2, running away'],
      answer: 1,
      why: 'Ke4 faces Ke6 with one square between. Then the pawn can go.',
    },
  },
  'rook-endings': {
    fen: '8/8/8/3k4/8/3P4/8/3RK3 w - - 0 1',
    task: 'Rook behind the passed pawn — yours. Activity beats a pawn. Do not park the rook on the back rank.',
    quiz: {
      prompt: 'Tarrasch’s rule for rook endings:',
      choices: ['Rook in front of the passer', 'Rook behind the passer', 'Rook next to the king'],
      answer: 1,
      why: 'Behind yours and theirs. A passive rook defending pawns is how these are lost.',
    },
  },
  lucena: {
    fen: '3K4/3P4/8/2k5/R7/8/8/3r4 w - - 0 1',
    extraFens: ['8/8/4k3/4P3/4K3/r7/8/R7 b - - 0 1'],
    task: 'Lucena: king in front of the pawn, build a bridge with the rook. Second position is Philidor — rook on the third rank until the pawn reaches the sixth.',
    quiz: {
      prompt: 'In Lucena, the rook’s job is to…',
      choices: ['Stay on the back rank', 'Build a bridge so the king can step out', 'Sacrifice for the pawn'],
      answer: 1,
      why: 'Check the king away, then interpose the rook (usually on the 4th). Philidor is the draw: third-rank defense, then checks from behind.',
    },
  },
  'minor-piece': {
    fen: '8/8/8/8/8/7k/7P/6BK w - - 0 1',
    task: 'Wrong bishop + rook pawn. If their king reaches the corner, you cannot queen. This is a draw if they get there.',
    quiz: {
      prompt: 'Why is this often a draw?',
      choices: ['Bishops always draw', 'The bishop cannot cover the queening square', 'White has no king'],
      answer: 1,
      why: 'h-pawn queens on a light square; this bishop is dark. If Black gets to h8, stalemate or blockade.',
    },
  },
  conversion: {
    fen: '4k3/8/4K3/4P3/8/8/8/4R3 w - - 0 1',
    task: 'You are winning. Convert: trade pieces not pawns, cut the king off, do not give a fortress or a perpetual.',
    quiz: {
      prompt: 'When ahead, the usual conversion rule is…',
      choices: ['Trade pawns, keep pieces', 'Trade pieces, keep pawns', 'Never trade anything'],
      answer: 1,
      why: 'Fewer pieces, more pawns: the extra pawn queens. If the engine said +3 and you drew, this node is the leak.',
    },
  },
}

export function studyFor(nodeId: string): RoadmapStudy | undefined {
  return ROADMAP_STUDY[nodeId]
}

export function studyDrillSearch(study: RoadmapStudy) {
  if (study.extraFens?.length) {
    return { fens: [study.fen, ...study.extraFens].join(';'), order: 'worst' as const }
  }
  return { fen: study.fen, order: 'worst' as const }
}

export function isLegalStudyFen(fen: string) {
  try {
    const board = new Chess(fen)
    return board.fen().startsWith(fen.split(' ')[0] ?? '') && board.moves().length > 0
  } catch {
    return false
  }
}
