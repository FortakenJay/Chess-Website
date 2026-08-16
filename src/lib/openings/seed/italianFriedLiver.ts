import type { KnowledgeCard } from '../types'

/** Hand-written. Explanations only. No evals, no frequencies. */
export const ITALIAN_FRIED_LIVER: KnowledgeCard = {
  name: 'Italian Game, Fried Liver Attack',
  side: 'w',
  eco: 'C57',
  move_order: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5 6.Nxf7',
  one_line_argument:
    'Invite ...Nxd5, then sac on f7 so Black’s king walks into a hunt on d5 and e6.',
  their_argument:
    'Decline with ...Na5 or ...Nd4 instead of recapturing on d5, and White’s knight raid is only a scare.',
  center: { type: 'open', structure_family: 'italian_open' },
  space_and_targets: {
    who_has_space: 'white',
    my_targets: ['f7', 'd5', 'e6'],
    their_targets: ['g5 knight if the sac is delayed'],
  },
  breaks: {
    mine: [
      {
        move: 'e4xd5',
        precondition: 'Ng5 already hitting f7, so ...d5 is forced',
      },
    ],
    theirs: [
      { move: '...d5', why: 'the only clean way to kick Bc4 after Ng5 hits f7' },
      { move: '...Na5', why: 'avoids recapturing on d5 and asks Bc4 to leave f7' },
    ],
  },
  problem_pieces: {
    mine: 'Nb1 still home while the kingside attack starts',
    theirs: 'Ke8 after Nxf7 forces it onto f7',
  },
  move_order_logic: [
    {
      move: '1.e4',
      tags: ['control_square'],
      why: 'Takes e4 and opens the queen and bishop, asking Black to occupy e5.',
    },
    {
      move: '2.Nf3',
      tags: ['tempo_gain'],
      why: 'Develops and hits e5, forcing Black to defend it.',
    },
    {
      move: '3.Bc4',
      tags: ['control_square'],
      why: 'Aims at f7, the weakest point in Black’s camp before castling.',
    },
    {
      move: '4.Ng5',
      tags: ['target_create'],
      why: 'Doubles the attack on f7 with Bc4, forcing ...d5 or a messy king walk.',
    },
    {
      move: '5.exd5',
      tags: ['open_line'],
      why: 'Opens the e-file and leaves the d5 recapture as the bait for Nxf7.',
    },
    {
      move: '6.Nxf7',
      tags: ['king_safety'],
      why: 'Rips the king onto f7 so Qf3 and d4 can hunt the knight on d5.',
    },
  ],
  expected_deviations: [],
  traps: [
    {
      line: '5...Nxd5 6.Nxf7 Kxf7 7.Qf3+ Ke6 8.Nc3',
      motif: 'king hunt / d5 pin',
    },
  ],
  typical_endgame: 'Rare — the line is decided in a king hunt or a lost piece',
  theory_load: 3,
  style_fit: 'direct attack, forced tactics, not a slow Italian',
  after_the_book: {
    when: 'Nxf7 is the last book move. After ...Kxf7 you are in a king hunt, not an opening. Every tempo has to check or threaten mate or the knight on d5.',
    your_jobs: [
      'Check with Qf3 and bring Nc3 so d5 cannot run.',
      'Open the center with d4 while their king is on e6 or f7.',
      'Do not grab hanging pawns if the king can slip to d8 and your attack dies.',
      'If they declined with ...Na5 instead of ...Nxd5, you are not in a Fried Liver — retreat or take on f7 only if the tactics still work.',
    ],
    their_jobs: [
      'Run the king toward the queenside (e6-d6-c7) and hold d5.',
      'Give back material to trade queens if the hunt is real.',
      'Decline the recapture on d5 next time (...Na5 or ...b5).',
    ],
    typical_structures: ['Open center, exposed king', 'No slow Italian chain'],
    if_they_deviate:
      'If they do not recapture on d5, stop. The Fried Liver is the recapture plus Nxf7. Anything else is a Two Knights middlegame — develop, do not sac on empty squares.',
  },
  quizzes: [
    {
      prompt: 'The Fried Liver book ends on Nxf7. What is the middlegame job?',
      choices: [
        'Hunt the king with Qf3, Nc3, and d4',
        'Castle and play a slow Italian with d3',
        'Grab every pawn on the seventh rank',
        'Trade into an ending because you are a piece up',
      ],
      answer: 0,
      why: 'You spent a piece to drag the king out. The only payment is checks and threats on d5 and e6.',
    },
    {
      prompt: 'Black can avoid the whole hunt by not recapturing on d5. Which try does that?',
      choices: [
        '...Na5, asking Bc4 to leave f7',
        '...Nxe4, grabbing a center pawn',
        '...h6, kicking Ng5 first',
        '...Qxd5, offering a queen trade',
      ],
      answer: 0,
      why: '...Na5 (or ...Nd4 / ...b5) refuses the bait. The Fried Liver only exists if they take on d5.',
    },
  ],
}
