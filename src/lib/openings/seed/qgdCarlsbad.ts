import type { KnowledgeCard } from '../types'

/** Hand-written. Explanations only. No evals, no frequencies. */
export const QGD_CARLSBAD: KnowledgeCard = {
  name: "Queen's Gambit Declined, Exchange (Carlsbad)",
  side: 'w',
  eco: 'D35',
  move_order: '1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 exd5 5.Bg5 Be7 6.e3 O-O 7.Bd3 Nbd7 8.Qc2 c6',
  one_line_argument:
    'Fix the pawn skeleton with cxd5, then minority-attack b4-b5 to make c6 and d5 weak.',
  their_argument:
    'Accept a slightly cramped center in return for a solid kingside and the ...Ne4 / ...c5 breaks.',
  center: { type: 'fixed', structure_family: 'carlsbad' },
  space_and_targets: {
    who_has_space: 'white',
    my_targets: ['c6 pawn', 'b7 if the minority attack lands'],
    their_targets: ['e3/d4 if White overextends on the queenside'],
  },
  breaks: {
    mine: [
      {
        move: 'b4-b5',
        precondition: 'Nb3 or Rab1 supporting b4, and ...c5 not yet freeing Black',
      },
    ],
    theirs: [
      { move: '...c5', why: 'challenges d4 and liquidates the Carlsbad structure' },
      { move: '...Ne4', why: 'forces a trade of the Bg5 pin and eases the cramp' },
    ],
  },
  problem_pieces: {
    mine: 'Nc3, idle if it never supports b4-b5',
    theirs: 'Bc8, boxed in by ...c6 and ...e6-gone',
  },
  move_order_logic: [
    {
      move: '1.d4',
      tags: ['control_square'],
      why: 'Takes d4 and starts the queen-pawn game that can become a Carlsbad.',
    },
    {
      move: '2.c4',
      tags: ['break_prep'],
      why: 'Pressures d5 so White can choose cxd5 and freeze the pawn skeleton.',
    },
    {
      move: '3.Nc3',
      tags: ['control_square'],
      why: 'Adds a second attacker to d5 before committing the exchange.',
    },
    {
      move: '4.cxd5',
      tags: ['structure_fix'],
      why: 'Locks pawns on d4 and d5 and creates the Carlsbad minority-attack job.',
    },
    {
      move: '5.Bg5',
      tags: ['trade_favorable'],
      why: 'Pins Nf6 so Black cannot easily play ...Ne4 without giving up the dark-squared bishop.',
    },
    {
      move: '6.e3',
      tags: ['break_prep'],
      why: 'Solidifies d4 and opens a path for Bd3, the piece that eyes h7 while the minority attack runs.',
    },
    {
      move: '7.Bd3',
      tags: ['develop'],
      why: 'Puts the bishop on the b1-h7 diagonal so Qc2 and a later kingside lift have a target.',
    },
    {
      move: '8.Qc2',
      tags: ['break_prep'],
      why: 'Eyes h7 and clears d1 so the a-pawn and b-pawn can start b4-b5.',
    },
  ],
  expected_deviations: [],
  traps: [
    {
      line: 'early ...Bf5 before ...c6, meeting Bd3 and Qb3 hitting b7',
      motif: 'loose queenside / b7',
    },
  ],
  typical_endgame: 'minority-attack rook ending with a weak c6 pawn',
  theory_load: 2,
  style_fit: 'long-term structure, slow pressure',
  after_the_book: {
    when: 'After Qc2 and ...c6 the pawn skeleton is already a Carlsbad. There is no more opening to recite — only the minority attack versus ...c5/...Ne4.',
    your_jobs: [
      'Start b4-b5 once Nb3 or Rab1 supports it, and ...c5 is not yet freeing Black.',
      'Keep a knight aimed at c5 or f5. Nc3 is idle if it never helps b4.',
      'Do not play e4 unless it wins a pawn or wrecks their structure — that releases the tension you wanted.',
      'If pieces come off, the weak c6 pawn is the conversion path.',
    ],
    their_jobs: [
      'Break with ...c5 or ...Ne4 before b5 lands.',
      'Use the kingside (...Bd6, ...Ne4, sometimes ...f5) while the queenside still holds.',
      'Keep the light-squared bishop useful; ...c6 and a missing e-pawn make Bc8 the problem child.',
    ],
    typical_structures: ['Carlsbad minority attack', 'IQP if ...c5 and trades on d4'],
    if_they_deviate:
      'If they play ...c5 early, switch to IQP thinking: blockade or attack d5, do not keep pushing b4-b5 on an already-open queenside.',
  },
  quizzes: [
    {
      prompt: 'The Carlsbad book is over. What is White’s long-term job?',
      choices: [
        'Minority attack with b4-b5 to weaken c6 and d5',
        'Castle long and mate on the h-file',
        'Play e4 as soon as possible',
        'Sacrifice a knight on f7',
      ],
      answer: 0,
      why: 'cxd5 froze the skeleton. The rest of the game is making c6 backward, then sitting on it.',
    },
    {
      prompt: 'Black’s two thematic ways to stop sitting in the cramp are…',
      choices: [
        '...c5 and ...Ne4',
        '...a6 and ...b5',
        '...g5 and ...h5',
        '...f6 and ...e5 on move six',
      ],
      answer: 0,
      why: '...c5 liquidates the structure. ...Ne4 trades the pin and eases the squeeze. Both beat waiting for b5.',
    },
  ],
}
