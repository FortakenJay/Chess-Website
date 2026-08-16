import type { KnowledgeCard } from '../types'

/** Hand-written. Explanations only. No evals, no frequencies. */
export const VIENNA_GAME: KnowledgeCard = {
  name: 'Vienna Game, Vienna Gambit',
  side: 'w',
  eco: 'C29',
  move_order: '1.e4 e5 2.Nc3 Nf6 3.f4 d5 4.fxe5 Nxe4 5.Nf3 Be7 6.d3 Nxc3 7.bxc3 O-O 8.Be2',
  one_line_argument:
    'Delay Nf3 so the f-pawn can strike with f4, opening the f-file and asking Black to solve king safety before the book even ends.',
  their_argument:
    'Meet f4 with ...d5, take the e4 outpost, then farm the doubled c-pawns once the attack cools.',
  center: { type: 'open', structure_family: 'vienna_gambit' },
  space_and_targets: {
    who_has_space: 'white',
    my_targets: ['f7', 'the f-file', 'e5 pawn chain leftovers'],
    their_targets: ['c3 doubled pawns', 'e5 if White delays development'],
  },
  breaks: {
    mine: [
      {
        move: 'f4',
        precondition: 'The king knight is still on g1, so the f-pawn is free',
      },
      {
        move: 'd4',
        why: 'The second central strike once Nf3 and Be2 are out, challenging e5 leftovers and freeing Bc1.',
      },
    ],
    theirs: [
      { move: '...d5', why: 'The correct central reaction to f4: meet a wing pawn with a center pawn.' },
      { move: '...c5', why: 'Hits d4/c3 after the book ends, turning White’s extra center into a target.' },
    ],
  },
  problem_pieces: {
    mine: 'Bc1 until d3 opens the c1-h6 diagonal',
    theirs: 'Bc8 if ...Be7 and ...d6 keep it behind the pawn chain',
  },
  move_order_logic: [
    {
      move: '1.e4',
      tags: ['control_square'],
      why: 'Takes e4 and opens the queen and bishop, asking Black to occupy e5.',
    },
    {
      move: '2.Nc3',
      tags: ['develop'],
      why: 'Develops the queen knight first so the f-pawn can still go to f4.',
    },
    {
      move: '3.f4',
      tags: ['break_prep'],
      why: 'The Vienna Gambit: f4 challenges e5 before Nf3 blocks the pawn.',
    },
    {
      move: '4.fxe5',
      tags: ['open_line'],
      why: 'Opens the f-file and asks Black to recapture or jump into e4.',
    },
    {
      move: '5.Nf3',
      tags: ['develop'],
      why: 'Finally develops the king knight, covering e5 and getting ready to castle.',
    },
    {
      move: '6.d3',
      tags: ['tempo_gain'],
      why: 'Hits the knight on e4 and opens a path for Bc1.',
    },
    {
      move: '7.bxc3',
      tags: ['structure_fix'],
      why: 'Recaptures on c3 and accepts doubled c-pawns in return for a center that can support d4 later.',
    },
    {
      move: '8.Be2',
      tags: ['king_safety'],
      why: 'Prepares O-O so the king leaves e1 before the f-file fully opens.',
    },
  ],
  expected_deviations: [],
  traps: [
    {
      line: '3.Bc4 Nxe4 4.Qh5 Nd6 5.Bb3, hoping for ...Nc6 6.Nb5 hitting c7 and f7',
      motif: 'fork on c7 / king hunt',
    },
    {
      line: '3.f4 exf4 4.e5 Qe7 5.Qe2, when Black’s knight on f6 has no good square',
      motif: 'pinned queen / cramped knight',
    },
  ],
  typical_endgame: 'doubled c-pawns versus extra center, or an f-file rook ending after kingside trades',
  theory_load: 3,
  style_fit: 'open piece play and king hunts, less Spanish memorization',
  variations: [
    {
      name: 'Stanley Variation (3.Bc4)',
      line: '1.e4 e5 2.Nc3 Nf6 3.Bc4',
      idea: 'Skip the gambit. Aim at f7 like an Italian, but keep the option of f4 later. Watch 3...Nxe4 4.Qh5.',
    },
    {
      name: 'Mieses Variation (3.g3)',
      line: '1.e4 e5 2.Nc3 Nf6 3.g3',
      idea: 'Fianchetto the king bishop, castle, and play a slower open game. Less forcing, same delay of Nf3.',
    },
    {
      name: 'Max Lange Defense (2...Nc6)',
      line: '1.e4 e5 2.Nc3 Nc6',
      idea: 'Black refuses ...Nf6 so f4 is less of a gambit. You can still play f4, or switch to Bc4 and a quiet Italian-style game.',
    },
  ],
  after_the_book: {
    when: 'After ...Nxe4 and the recapture on c3, the named line is over. You are in a middlegame with an open f-file and doubled c-pawns.',
    your_jobs: [
      'Castle, then put a rook on the f-file and look at f7.',
      'Play d4 when e5 is under enough pressure — that is the second break, not a new opening.',
      'Do not grab the e5 pawn with the queen while your king is still in the center.',
      'Develop Bc1 (Be3 or Bg5) before launching a pawn storm.',
    ],
    their_jobs: [
      'Pressure e5 and the doubled c-pawns instead of matching you move-for-move.',
      'Castle, then meet f-file pressure with piece trades or ...f5.',
      'Break with ...c5 if your extra center becomes a target rather than a squeeze.',
    ],
    typical_structures: [
      'Open f-file after the gambit',
      'Doubled c-pawns, extra center',
    ],
    if_they_deviate:
      'If they skip ...d5 after f4, take on e5 and develop fast. If they play 2...Nc6, you can still go f4 or switch to a quiet Bc4 game — do not recite the gambit anyway.',
  },
  quizzes: [
    {
      prompt: 'Why play 2.Nc3 instead of the usual 2.Nf3?',
      choices: [
        'To keep the f-pawn free for f4',
        'To attack d5 on the next move',
        'To force a Spanish transposition',
        'To trap the black queen on d8',
      ],
      answer: 0,
      why: 'Nc3 develops and still leaves f4 available. Nf3 would block the f-pawn and turn it into a normal Open Game.',
    },
    {
      prompt: 'After 3.f4, what is Black’s thematic central reaction?',
      choices: [
        '...Qh4+',
        '...Bc5',
        '...d5',
        '...f5',
      ],
      answer: 2,
      why: 'Meet a wing pawn with a center pawn. ...d5 opens lines for Black’s pieces and occupies e4 after fxe5.',
    },
    {
      prompt: 'In the quiet 3.Bc4 line, Black takes on e4. What is White’s idea?',
      choices: [
        'Bxf7+ immediately',
        'Qh5, hitting e5 and f7',
        'Nxe4, grabbing a piece',
        'd4, opening the center',
      ],
      answer: 1,
      why: '4.Qh5 forks the threats on e5 and f7. Black’s knight usually drops back to d6, and Nb5 can then hit c7.',
    },
    {
      prompt: 'When the book ends, what is your first middlegame job?',
      choices: [
        'Castle and occupy the f-file',
        'Hunt the e5 pawn with the queen',
        'Castle long and pawn-storm the kingside',
        'Trade every piece into a king ending',
      ],
      answer: 0,
      why: 'The f-file is the point of the gambit. King safety first, then the rook belongs on f1 looking at f7.',
    },
  ],
}
