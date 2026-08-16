import type { EndgameType, Motif, Phase } from '@/lib/analysis/types'
import type { StructureId } from '@/lib/openings/structures'

export type RoadmapHref =
  | { to: '/trainer/$username'; search?: { tab?: 'openings' | 'structures'; structure?: string } }
  | { to: '/puzzles/$username' }
  | { to: '/positions/$username' }
  | {
      to: '/drill/$username'
      search: {
        motif?: Motif
        phase?: Phase
        endgameType?: EndgameType
        fen?: string
        fens?: string
        order?: 'worst'
      }
    }
  | { to: '/results/$username/openings' }
  | { to: '/results/$username/strategy' }
  | { to: '/results/$username/endgames' }

export type RoadmapTag =
  | { type: 'motif'; motif: Motif }
  | { type: 'opening'; names: string[]; eco: string; exclude?: string[] }
  | { type: 'structure'; structure: StructureId }
  | { type: 'phase'; phase: Phase }

function op(names: string[], eco: string, exclude?: string[]): RoadmapTag {
  return exclude ? { type: 'opening', names, eco, exclude } : { type: 'opening', names, eco }
}

export type RoadmapItem = {
  label: string
  href: RoadmapHref
}

export type RoadmapNode = {
  id: string
  title: string
  moves?: string
  why: string
  white?: string
  black?: string
  know: string[]
  items: RoadmapItem[]
  tag?: RoadmapTag
}

export type RoadmapTrack = {
  id: string
  name: string
  kicker: string
  nodes: RoadmapNode[]
}

function drill(motif: Motif, label = 'Drill your leaks'): RoadmapItem {
  return { label, href: { to: '/drill/$username', search: { motif, order: 'worst' } } }
}

function phaseDrill(phase: Phase, label: string): RoadmapItem {
  return { label, href: { to: '/drill/$username', search: { phase, order: 'worst' } } }
}

function puzzles(label = 'Puzzle this pattern'): RoadmapItem {
  return { label, href: { to: '/puzzles/$username' } }
}

function trainer(label = 'Open the trainer'): RoadmapItem {
  return { label, href: { to: '/trainer/$username' } }
}

function lab(structure: StructureId, label = 'Open this structure'): RoadmapItem {
  return { label, href: { to: '/trainer/$username', search: { tab: 'structures', structure } } }
}

function endgameLeaks(type: EndgameType, label: string): RoadmapItem {
  return {
    label,
    href: { to: '/drill/$username', search: { phase: 'endgame', endgameType: type, order: 'worst' } },
  }
}

export const ROADMAP_TRACKS: RoadmapTrack[] = [
  {
    id: 'tactics',
    name: 'Tactics',
    kicker: 'See it first',
    nodes: [
      {
        id: 'hanging',
        title: 'Hanging piece',
        why: 'A piece that is not defended, or defended fewer times than it is attacked. Most rating leaks start here.',
        know: [
          'Count attackers vs defenders before you move.',
          'After every capture, recapture, and zwischenzug, recount.',
          'A “safe” piece on a square the opponent just vacated is often hanging.',
        ],
        items: [drill('hanging_piece'), puzzles(), { label: 'Your hanging-piece positions', href: { to: '/positions/$username' } }],
        tag: { type: 'motif', motif: 'hanging_piece' },
      },
      {
        id: 'fork',
        title: 'Fork',
        why: 'One piece attacks two. Knights do this for a living; pawns and kings do it in endings.',
        know: [
          'Look at every square a knight can jump to after the opponent’s last move.',
          'Royal forks (king + queen/rook) win material even if the second piece is defended.',
          'Pawn forks on the 4th/5th rank are the cheapest tactics in the opening.',
        ],
        items: [drill('fork'), puzzles()],
        tag: { type: 'motif', motif: 'fork' },
      },
      {
        id: 'pin',
        title: 'Pin',
        why: 'A piece cannot move without exposing something more valuable behind it.',
        know: [
          'Absolute pin: pinned to the king. The piece cannot legally move.',
          'Relative pin: pinned to the queen or rook. It can move, but it usually shouldn’t.',
          'Pile up on a pinned piece. The pin is the setup, not the finish.',
        ],
        items: [drill('pin'), puzzles()],
        tag: { type: 'motif', motif: 'pin' },
      },
      {
        id: 'skewer',
        title: 'Skewer',
        why: 'The reverse pin: the valuable piece is in front. When it steps aside, the one behind falls.',
        know: [
          'Bishops and rooks skewer along the same lines they pin.',
          'King skewers on an open file or diagonal are the classic back-rank cousin.',
          'If the front piece is the king, the rear piece is free.',
        ],
        items: [drill('skewer'), puzzles()],
        tag: { type: 'motif', motif: 'skewer' },
      },
      {
        id: 'discovered',
        title: 'Discovered attack',
        why: 'Move one piece, and a hidden battery fires. A discovered check on the king is almost always winning.',
        know: [
          'The moving piece can go anywhere — even a quiet square — if the piece behind it hits something bigger.',
          'Double check: king must move. No capture or interposition.',
          'Set batteries on files (rooks) and diagonals (bishops) before the discovery exists.',
        ],
        items: [drill('discovered_attack'), puzzles()],
        tag: { type: 'motif', motif: 'discovered_attack' },
      },
      {
        id: 'back-rank',
        title: 'Back rank',
        why: 'King trapped behind its own pawns. One rook or queen on the eighth ends the game.',
        know: [
          'Luft: h3/h6 or a3/a6 so the king has an escape square.',
          'Two rooks on the seventh (or second) beat one back-rank mate threat.',
          'If their back rank is weak, a rook trade on the open file is often a mate threat, not a simplification.',
        ],
        items: [drill('back_rank'), puzzles()],
        tag: { type: 'motif', motif: 'back_rank' },
      },
      {
        id: 'mate',
        title: 'Mate patterns',
        why: 'Missed mates are the most expensive tactic. Pattern-match first, then calculate.',
        know: [
          'Anastasia, Arabian, smothered, back-rank, Opera, Legal’s — name them so you see them.',
          'If the king has no flight squares, every check is a candidate mate.',
          'Do not take the hanging queen if there is mate in one.',
        ],
        items: [drill('missed_mate', 'Drill missed mates'), puzzles()],
        tag: { type: 'motif', motif: 'missed_mate' },
      },
      {
        id: 'calculation',
        title: 'Calculation',
        why: 'Checks, captures, threats — in that order. Forcing moves shrink the tree.',
        know: [
          'Candidate moves first, then a line. Do not calculate a move you already rejected.',
          'At the end of every line, ask: can they check, capture, or threaten something bigger?',
          'If a tactic fails by one tempo, look for a quiet setup move.',
        ],
        items: [puzzles('Calculate in puzzles'), phaseDrill('middlegame', 'Drill middlegame leaks')],
        tag: { type: 'phase', phase: 'middlegame' },
      },
    ],
  },
  {
    id: 'open-games',
    name: '1.e4 e5',
    kicker: 'Open games',
    nodes: [
      {
        id: 'italian',
        title: 'Italian',
        moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4',
        why: 'The slow open game. White aims at f7. Black copies with …Bc5 or fights with …Nf6 (Two Knights).',
        white: 'c3 then d3, or d4 at once. The bishop on c4 never leaves the a2-g8 diagonal without a reason.',
        black: 'Giuoco Piano: …Bc5 and wait for …d5. Two Knights: …Nf6 and be ready for Ng5.',
        know: [
          'Giuoco Piano: 3…Bc5 4.c3 Nf6 5.d3 — tense center, d4 later.',
          'Two Knights: 3…Nf6 4.Ng5 d5. Fried Liver is 4…Nxd5 5.Nxf7 — only if they recapture on d5.',
          '…Na5 asks the c4 bishop to leave f7.',
        ],
        items: [trainer('Train the Italian'), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['italian', 'giuoco', 'two knights'], 'C50-C59'),
      },
      {
        id: 'spanish',
        title: 'Spanish',
        moves: '1.e4 e5 2.Nf3 Nc6 3.Bb5',
        why: 'White pressures e5 by threatening to take the defender. Longer theory, slower squeeze than the Italian.',
        white: 'Castle, c3, d3 or d4. The bishop often drops back to a4-b3 and stays on that diagonal for 20 moves.',
        black: 'Morphy …a6. Closed Spanish holds the center; Open Spanish takes …Nxe4 and accepts an isolated d-pawn fight.',
        know: [
          '3…a6 4.Ba4 Nf6 5.O-O Be7 is the Closed Spanish.',
          'Marshall: …d5 pawn sac for a kingside attack. White must know the first ten moves or decline.',
          'Exchange 4.Bxc6 dxc6: White plays for a kingside majority ending; Black has the bishop pair.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['spanish', 'ruy lopez'], 'C60-C99'),
      },
      {
        id: 'scotch',
        title: 'Scotch',
        moves: '1.e4 e5 2.Nf3 Nc6 3.d4',
        why: 'White opens the center on move three. Piece activity and king safety decide it immediately. Time beats material.',
        white: 'Take on d4, develop fast, castle. Do not hunt pawns while their pieces come out.',
        black: '…exd4. Then …Bc5 or …Nf6. Get the king out before the position explodes.',
        know: [
          '4.Nxd4 Nf6 5.Nxc6 bxc6 — Black’s extra center pawn vs White’s faster development.',
          '4…Bc5 5.Nxc6 Qf6 is a common trap line; know the recapture.',
          'This is an open center: develop, castle, occupy files.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['scotch'], 'C45'),
      },
      {
        id: 'kings-gambit',
        title: "King's Gambit",
        moves: '1.e4 e5 2.f4',
        why: 'White offers a pawn to open the f-file and grab the center. Sharp, forcing, heavy on king safety.',
        white: 'If they take, Nf3 then d4 or Bc4. Do not play Qh5+ lines unless you know them.',
        black: 'Accepted: …exf4 and hold the pawn or give it back for development. Declined: …Bc5 and the f4 pawn is a weakness.',
        know: [
          '2…exf4 3.Nf3 stops …Qh4+.',
          'Falkbeer 2…d5 hits back in the center instead of grabbing f4.',
          'White’s king is the bill. If development lags, the gambit is just a hole on e1.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['kings gambit'], 'C30-C39'),
      },
      {
        id: 'petrov',
        title: 'Petrov',
        moves: '1.e4 e5 2.Nf3 Nf6',
        why: 'Black copies the attack on e4. Solid, symmetrical, fewer chances both ways. Equalize first.',
        white: '3.Nxe5 d6 4.Nf3 Nxe4 5.d4 — main line. Or 3.d4 for more fight.',
        black: 'Do not recapture 3…Nxe4 immediately (4.Qe2). Play …d6 first.',
        know: [
          'The trap: 3.Nxe5 Nxe4? 4.Qe2 and the knight is lost or the king walks.',
          'After 5.d4 d5 the structure is a tense open game with a knight on e4.',
          'This is the solid 1…e5 choice: fewer imbalances, fewer wins both ways.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['petrov', 'petroff', 'russian game'], 'C42-C43'),
      },
    ],
  },
  {
    id: 'semi-open',
    name: '1.e4 besides …e5',
    kicker: 'Semi-open',
    nodes: [
      {
        id: 'sicilian',
        title: 'Sicilian',
        moves: '1.e4 c5',
        why: 'Black concedes a center pawn to get a c-file and a real counterattack. Asymmetrical. Usually a race.',
        white: 'Open Sicilian: d4, then kingside attack (f4–f5 or g4). Closed: Nc3, g3, slower.',
        black: 'Najdorf/Scheveningen: …d6 and …e6 or …a6. Dragon: …g6. The equalizer is …d5.',
        know: [
          'After …cxd4 the c-file is Black’s. Rooks belong there.',
          'Maróczy Bind (c4+e4) is White trying to stop …b5 and …d5.',
          'If you play this and forget a line, you get punished harder than in a Caro-Kann.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['sicilian'], 'B20-B99'),
      },
      {
        id: 'french',
        title: 'French',
        moves: '1.e4 e6 2.d4 d5',
        why: 'Black builds a solid chain and hits d4 with …c5. The light-squared bishop is the problem child.',
        white: 'Advance 3.e5: attack the kingside, the chain points there. Exchange 3.exd5: open and quieter. Tarrasch/Nc3: more theory.',
        black: '…c5 against the Advance. …Qb6 hits b2 and d4. The bad bishop gets out via …b6 or after the center opens.',
        know: [
          'Advance chain: White d4-e5, Black d5-e6. Hit the base (d4) with …c5.',
          '…f6 later chips e5 — too early and e6/g6 sag.',
          'Exchange French is an open e-file. Develop and castle; it is not “a draw” if they play.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['french'], 'C00-C19'),
      },
      {
        id: 'caro-kann',
        title: 'Caro-Kann',
        moves: '1.e4 c6 2.d4 d5',
        why: 'Solid like the French, but the light-squared bishop can get out before …e6. Equalize first.',
        white: 'Advance, Classical 3.Nc3, or Exchange/Panov. Panov can become an IQP.',
        black: 'Get …Bf5 or …Bg4 in. Do not lock the bishop in with a premature …e6.',
        know: [
          '3.Nc3 dxe4 4.Nxe4 Bf5 is the Classical. Black is cramped but solid.',
          'Advance 3.e5 Bf5 — same chain logic as the French, better bishop.',
          'Fewer imbalances, fewer chances both ways. You play for a win later.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['caro'], 'B10-B19'),
      },
      {
        id: 'scandinavian',
        title: 'Scandinavian',
        moves: '1.e4 d5',
        why: 'Black opens the center at once and usually loses a tempo with the queen. Simple development fight.',
        white: 'Take, then Nc3 hitting the queen. Develop around the extra tempo. Do not overextend hunting the queen.',
        black: '2…Qxd5 3.Nc3 Qa5 or …Qd6. Get pieces out, castle, then …c6 and …e6.',
        know: [
          '3.Nc3 Qa5 4.d4 Nf6 5.Nf3 — main. …Bg4 pins, …c6 is the solidifying move.',
          '2…Nf6 (Modern) recaptures with the knight instead of the queen.',
          'If the queen gets kicked around, you are lost in development, not in pawns.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['scandinavian', 'center counter'], 'B01'),
      },
      {
        id: 'pirc',
        title: 'Pirc',
        moves: '1.e4 d6 2.d4 Nf6 3.Nc3 g6',
        why: 'Hypermodern. Black lets White take the center, then chips it with …e5 or …c5.',
        white: 'Austrian 4.f4 is the aggressive try. Classical Be2/Nf3 is slower. The big center is real until it is not.',
        black: 'Fianchetto, castle, then …e5 or …c5. Do not sit while White rolls f4-f5.',
        know: [
          'The center is a target, not something to copy.',
          'If White gets e5 in cleanly, Black’s knight has no square and the kingside gets stormed.',
          '…c6 and …b5 is queenside expansion when the center is closed.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['pirc'], 'B07-B09'),
      },
      {
        id: 'alekhine',
        title: 'Alekhine',
        moves: '1.e4 Nf6',
        why: 'Black invites e5 and then attacks the overextended pawns. All-in hypermodern.',
        white: 'Four Pawns (c4-d4-e5-f4) is the principled grab. Exchange on d6 is quieter.',
        black: '…d6 and …c5 / …Nc6 hit the pawn chain. The e5 pawn is the target.',
        know: [
          '2.e5 Nd5 3.d4 d6 — the starting fight.',
          'If White’s pawn storm is not supported by pieces, the center collapses.',
          'Do not play this as a “trap opening.” The plan is the overextended center.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['alekhine'], 'B02-B05'),
      },
    ],
  },
  {
    id: 'd4',
    name: '1.d4',
    kicker: 'Closed and semi-closed',
    nodes: [
      {
        id: 'qgd',
        title: 'QGD',
        moves: '1.d4 d5 2.c4 e6',
        why: 'The tense queen-pawn game. Pawns touching, nothing traded yet. Whoever releases first usually concedes something.',
        white: 'Keep the tension. Nc3, Nf3, Bg5. cxd5 (Carlsbad) only when the pieces are ready for b4-b5.',
        black: 'Hold d5. …c5 or …dxc4 when the c8 bishop has a future. Orthodox …Be7 and …O-O first.',
        know: [
          'Do not take on c4 or d5 just to “simplify.”',
          'Exchange (cxd5 exd5) is the Carlsbad skeleton: minority attack vs …e5.',
          'The c8 bishop is the problem until …b6, …dxc4, or the center opens.',
        ],
        items: [trainer('Train a QGD line'), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['queens gambit declined', 'qgd'], 'D30-D69'),
      },
      {
        id: 'qga',
        title: 'QGA',
        moves: '1.d4 d5 2.c4 dxc4',
        why: 'Black gives the center to free the bishop and hit back with …c5. Often becomes an IQP.',
        white: 'e3 or e4 to recapture c4, then d4 and e4 as a pair. Do not let …b5 keep the pawn for free.',
        black: '…e6, …c5, …a6. If White gets an isolated d-pawn, you blockade d5 and trade pieces.',
        know: [
          '3.Nf3 Nf6 4.e3 e6 5.Bxc4 c5 is Classical.',
          'IQP rule: owner attacks now; defender trades toward the ending.',
          '…b5 too early hangs the queenside if White has a3 and a rook on the a-file.',
        ],
        items: [trainer('Train the QGA'), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['queens gambit accepted', 'qga'], 'D20-D29'),
      },
      {
        id: 'slav',
        title: 'Slav',
        moves: '1.d4 d5 2.c4 c6',
        why: 'Solid, and the light-squared bishop can still get out. Equalize first.',
        white: 'Nf3, Nc3, e3 or the Exchange. Pressure d5 without handing Black a free …dxc4 plus …b5.',
        black: '…Nf6, …Bf5 or …Bg4 before …e6. Main line …dxc4 then …b5 is a fight, not a pawn steal.',
        know: [
          'Exchange Slav (cxd5 cxd5) is very equal. Keep pieces if you need a result.',
          '…Bf5 is the whole point versus the QGD’s trapped bishop.',
          'If White plays Qb3, b7 and d5 are both hanging — know the answer.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['slav'], 'D10-D19'),
      },
      {
        id: 'catalan',
        title: 'Catalan',
        moves: '1.d4 Nf6 2.c4 e6 3.g3',
        why: 'White fianchettos and pressures the long diagonal. A queen-pawn game with a sniper on g2.',
        white: 'Bg2, Nf3, O-O. Keep tension. If they take …dxc4, pick on the queenside pawns.',
        black: 'Open: …dxc4 and …c5/…b5. Closed: hold d5. The g2 bishop is the piece you have to respect.',
        know: [
          'The opening is the bishop on g2, not a trap on b7.',
          '…c5 is Black’s break. …dxc4 without a plan leaves hanging queenside pawns.',
          'Can transpose into Carlsbad or IQP after the first trade.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['catalan'], 'E00-E09'),
      },
      {
        id: 'london',
        title: 'London',
        moves: '1.d4 d5 2.Nf3 Nf6 3.Bf4',
        why: 'Solid triangle c3-d4-e3, knight on e5, low theory. You still need the plan or you get outplayed slowly.',
        white: 'c3, e3, Bd3, Nbd2, Ne5. The f4 bishop is the signature. Do not drop b2 to …Qb6 unless you know it.',
        black: '…c5 and …Qb6 hit b2/d4. Contest e5. …Nh5 asks the London bishop to stay or go.',
        know: [
          'This is a structure opening, not a “system” you can play on autopilot.',
          'e5 is the outpost both sides contest.',
          'If Black gets …c5 and …Nc6 in cleanly, White’s d4 is under the same pressure as a QGD.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['london'], 'D02'),
      },
      {
        id: 'kid',
        title: "King's Indian",
        moves: '1.d4 Nf6 2.c4 g6 3.Nc3 Bg7',
        why: 'Hypermodern fight. Black lets White take the center, then plays …e5 and …f5. A race, not a squeeze.',
        white: 'Close with d5, then c5 on the queenside. The chain points that way. Be faster than their kingside storm.',
        black: '…d6, …O-O, …e5. When d5 closes, …f5. Knights to f4, pawns to g5. Do not play on the wrong wing.',
        know: [
          'Closed KID: White c5, Black …f5 — because that is where each chain gives space.',
          'If you take …exd4 instead, you get a different, more open game.',
          'g7 bishop is a tall pawn until the center opens.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['kings indian'], 'E60-E99', ['attack']),
      },
      {
        id: 'nimzo',
        title: 'Nimzo-Indian',
        moves: '1.d4 Nf6 2.c4 e6 3.Nc3 Bb4',
        why: 'Black pins Nc3 and fights for e4 without committing a pawn yet. Control, then a break.',
        white: 'a3 asking the bishop, or e3/Qc2. Doubled c-pawns are a structure, not a tragedy — extra center vs the bishop pair.',
        black: '…Bxc3 when it wrecks the pawns or wins a fight for e4. Then …c5 or …d5.',
        know: [
          'The pin is prophylaxis against e4.',
          'If White gets e4 in for free, the Nimzo lost its argument.',
          'Hübner: …c5, …Nc6, doubled pawns, closed c-file — a structure fight.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['nimzo'], 'E20-E59'),
      },
      {
        id: 'grunfeld',
        title: 'Grünfeld',
        moves: '1.d4 Nf6 2.c4 g6 3.Nc3 d5',
        why: 'Black strikes the center at once. White’s huge pawn center is the target. …c5 and the g7 bishop are the opening.',
        white: 'Exchange: cxd5 Nxd5 e4. Hold d4/e4. e5 only when it does not drop the center.',
        black: '…c5, …Nc6, pressure d4. Do not copy the pawn center — attack it.',
        know: [
          'After 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3, White has c3-d4-e4.',
          '…cxd4 can leave hanging pawns or an IQP. Know which one you are walking into.',
          'This is the hypermodern exam.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['grunfeld'], 'D70-D99'),
      },
      {
        id: 'benoni',
        title: 'Benoni',
        moves: '1.d4 Nf6 2.c4 c5 3.d5',
        why: 'Black concedes space for a queenside majority and the g7 bishop. e5 vs …b5 is the race.',
        white: 'e4, Nf3, the e5 break. Keep their …b5 from rolling.',
        black: '…e6, …exd5, …d6, …g6. Then …a6/…b5. The long diagonal is why you played this.',
        know: [
          'd6 is backward. That is the bill for the majority.',
          'White’s d5 pawn is a wedge or a weakness depending on whether e5 lands.',
          'If you play this “solid,” you are playing the wrong opening.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['benoni'], 'A43-A44,A56-A79'),
      },
      {
        id: 'dutch',
        title: 'Dutch',
        moves: '1.d4 f5',
        why: 'Black grabs kingside space on move one. Stonewall and Leningrad are different games.',
        white: 'c4, g3, contest e5. Trade Black’s good bishop. The f5 pawn is space and a hole.',
        black: 'Stonewall: …e6/…d5/…c6 and Ne4. Leningrad: …g6 and a KID with f5 already on.',
        know: [
          'e5 is the hole. A White knight there is the typical punishment.',
          'Stonewall’s c8 bishop is bad until the wall breaks.',
          '…e5 is the break that opens your own king if the pieces are not ready.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['dutch'], 'A80-A99'),
      },
      {
        id: 'english',
        title: 'English',
        moves: '1.c4',
        why: 'Flank opening. White fights for d5 from the side and can still transpose to 1.d4.',
        white: 'g3, Bg2, Nc3. Botvinnik setup (c4-e4-d3) vs …c5. Or transpose with d4 when it helps.',
        black: '…e5 reversed Sicilian, …c5 symmetrical, or …e6/…d5 into a QGD with colors flipped.',
        know: [
          '1.c4 e5 is a Sicilian reversed. You have an extra tempo. Use it.',
          'Hedgehog vs the English: Black coils a6/b6/d6/e6 and waits for …b5/…d5.',
          'You can still steer into slower d4 structures. That is the point of the flank.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['english'], 'A10-A39'),
      },
      {
        id: 'reti',
        title: 'Réti',
        moves: '1.Nf3 d5 2.c4',
        why: 'Hypermodern flank. White delays the d-pawn and pressures d5 from c4 and g2.',
        white: 'g3, Bg2, b3 sometimes. Take on d5 or keep tension. d4 later transposes to Catalan/QGD.',
        black: 'Hold d5 with …c6 or …e6, or take …dxc4. …d4 closes the center and changes the job.',
        know: [
          'This is not “unpredictable.” The jobs are still d5, the long diagonal, and a later d4/e4.',
          '…d4 gains space and can leave e4 as a hole.',
          'If you wanted a London, play a London. Do not mix the plans.',
        ],
        items: [trainer(), { label: 'Your opening results', href: { to: '/results/$username/openings' } }],
        tag: op(['reti'], 'A04-A09'),
      },
    ],
  },
  {
    id: 'structures',
    name: 'Structures',
    kicker: 'Pawn skeletons',
    nodes: [
      {
        id: 'carlsbad',
        title: 'Carlsbad',
        moves: 'White d4/e3, Black d5/c6 — e-pawn and c-pawn exchanged',
        why: 'The minority-attack structure. White plays b4-b5; Black plays …e5 or kingside pieces.',
        white: 'Rab1, b4-b5, make c6 and d5 weak, sit on them.',
        black: '…e5 before the queenside caves in, or …Ne4/…Bd6.',
        know: [
          'Do not rush …c5 if it leaves d5 isolated without activity.',
          'Knights want c4/e5. Black’s light-squared bishop is the problem after …c6.',
          'If pieces come off, White’s rook ending vs weak c6 is the conversion.',
        ],
        items: [lab('carlsbad')],
        tag: { type: 'structure', structure: 'carlsbad' },
      },
      {
        id: 'iqp',
        title: 'Isolated QP',
        moves: 'White pawn on d4, no c- or e-pawns beside it',
        why: 'Middlegame asset, endgame liability. Owner attacks now. Defender trades.',
        white: 'Pieces out, knight on e5, d5 break while activity is high.',
        black: 'Blockade d5, trade pieces, farm the pawn later.',
        know: [
          'Whoever owns d5 owns the structure.',
          'Do not trade all the pieces if you have the IQP.',
          'Do not keep all the pieces if you face it.',
        ],
        items: [lab('iqp_white')],
        tag: { type: 'structure', structure: 'iqp_white' },
      },
      {
        id: 'maroczy',
        title: 'Maróczy Bind',
        moves: 'White c4+e4 vs Black d6, no …c5',
        why: 'The clamp. White prevents …b5 and …d5. Black’s whole game is preparing exactly those two breaks.',
        white: 'Squeeze. Knights on d5/c3. Do not give the breaks away.',
        black: '…a6/…Bd7 toward …b5, or …e6/…Ne5 toward …d5. Sit until one is real.',
        know: [
          'If …d5 lands and pieces come off, the bind is gone.',
          'White rarely needs a pawn break. The bind is the plan.',
          'Overextending c4 turns the clamp into a target.',
        ],
        items: [lab('maroczy')],
        tag: { type: 'structure', structure: 'maroczy' },
      },
      {
        id: 'hedgehog',
        title: 'Hedgehog',
        moves: 'Black a6/b6/d6/e6',
        why: 'Black coils on three ranks, then explodes with …b5 or …d5. Timing is the tactic.',
        white: 'Keep the clamp. Space is the whole advantage. Meet the explosion with trades that leave weak pawns.',
        black: '…Qc7, …Nbd7, bishops on b7/e7. Break only when the tactics work after the pawn lands.',
        know: [
          'The two legal explosions are …b5 and …d5. Everything else is waiting.',
          'If you never break, the squeeze wins.',
          'If the position opens, Black’s bishops become the story.',
        ],
        items: [lab('hedgehog')],
        tag: { type: 'structure', structure: 'hedgehog' },
      },
      {
        id: 'french-advance',
        title: 'French Advance',
        moves: 'White d4-e5 vs Black d5-e6',
        why: 'Chains point at the attack. White kingside, Black queenside. Hit the base of the chain.',
        white: 'Piece attack on the king. The c1 bishop needs a job (Be3-Qd2 or b3-Ba3).',
        black: '…c5 first, then …Nc6 and pressure d4. …f6 later, not first.',
        know: [
          'd4 is White’s base — the target.',
          'Locked chain: knights and outposts beat bishops until it opens.',
          '…f6 too early sags e6 and g6.',
        ],
        items: [lab('french_advance')],
        tag: { type: 'structure', structure: 'french_advance' },
      },
      {
        id: 'kid-closed',
        title: 'KID closed',
        moves: 'White c4-d5-e4 vs Black d6-e5',
        why: 'The race. White c5, Black …f5. Not because of a memorized line — because that is where each chain gives space.',
        white: 'b4, c5, crack the c-file before the kingside lands.',
        black: '…f5, lift, …f4 and …g5. Do not play …c5 here — that is White’s wing.',
        know: [
          'Wrong-wing play loses the race, not the “better structure.”',
          'd6 is backward on a closed file. Live with it.',
          'g7 bishop is a tall pawn until something opens.',
        ],
        items: [lab('kid_closed')],
        tag: { type: 'structure', structure: 'kid_closed' },
      },
      {
        id: 'benoni-structure',
        title: 'Benoni skeleton',
        moves: 'White d5-e4 vs Black c5-d6',
        why: 'Space wedge vs queenside majority. e5 vs …b5.',
        white: 'Prepare e5. Knights on c4/e4.',
        black: '…a6/…b5 and the g7 bishop. The majority wants a passer.',
        know: [
          'd6 is the bill. e4 can become a target.',
          'If e5 lands first, Black’s position can collapse in the center.',
          'If …b5 rolls first, White’s extra space does not convert.',
        ],
        items: [lab('benoni')],
        tag: { type: 'structure', structure: 'benoni' },
      },
      {
        id: 'grunfeld-center',
        title: 'Grünfeld center',
        moves: 'White c3-d4-e4 vs Black no d-pawn, g6',
        why: 'The big center is real space until …c5 proves it is a target.',
        white: 'Hold d4/e4. Develop. e5 only when supported.',
        black: '…c5, …Bg7, pressure d4. The center is the target, not something to copy.',
        know: [
          '…cxd4 can become hanging pawns or an IQP. Know which.',
          'If the center holds, White’s space converts.',
          'If it collapses, see the IQP lesson.',
        ],
        items: [lab('grunfeld_exchange')],
        tag: { type: 'structure', structure: 'grunfeld_exchange' },
      },
      {
        id: 'slav-structure',
        title: 'Slav skeleton',
        moves: 'White d4-c4 vs Black d5-c6',
        why: 'Tense, with Black’s bishop still able to get out. The first capture sets the rest of the game.',
        white: 'Pressure d5. Decide between taking and keeping tension.',
        black: '…Bf5/…Bg4 before locking …e6. …dxc4 plus …b5 is a plan, not a pawn grab.',
        know: [
          'cxd5 can become Exchange Slav (dead equal) or a Carlsbad cousin.',
          'The c8 bishop is why you played …c6 instead of …e6.',
        ],
        items: [lab('slav')],
        tag: { type: 'structure', structure: 'slav' },
      },
      {
        id: 'stonewall',
        title: 'Stonewall',
        moves: 'Pawns on c3-d4-e3-f4 (or the Black version c6-d5-e6-f5)',
        why: 'The wall. Attack where the pawns point. e4/e5 is a hole. The queen bishop is bad.',
        white: 'Ne5, kingside lift, f5 or e4. Fix the c1 bishop with b3-Ba3.',
        black: 'Chip the head (…c5) and the dark squares. Trade the Ne5.',
        know: [
          'The wall is only good if the attack lands first.',
          'If e4 opens it, the bad bishop becomes a piece again.',
        ],
        items: [lab('stonewall_black')],
        tag: { type: 'structure', structure: 'stonewall_black' },
      },
    ],
  },
  {
    id: 'strategy',
    name: 'Strategy',
    kicker: 'What the position wants',
    nodes: [
      {
        id: 'open-center',
        title: 'Open center',
        why: 'Pawns traded off (Scotch, Exchange French). Piece activity and initiative decide it. Time beats material.',
        know: [
          'Develop, castle, occupy files with rooks.',
          'King safety is critical because tactics come immediately.',
          'Do not spend five moves repositioning a piece. That is for closed positions.',
        ],
        items: [{ label: 'Your strategy results', href: { to: '/results/$username/strategy' } }],
        tag: { type: 'phase', phase: 'middlegame' },
      },
      {
        id: 'closed-center',
        title: 'Closed center',
        why: 'Locked chains (KID mainline, French Advance). Play shifts to the wings. Attack where your chain points.',
        know: [
          'Knights often beat bishops. Outposts matter more than open diagonals.',
          'You can spend five moves rerouting a piece.',
          'Wrong-wing play is how these games are lost.',
        ],
        items: [lab('kid_closed'), lab('french_advance', 'French Advance chain')],
      },
      {
        id: 'fixed-center',
        title: 'Fixed / semi-open',
        why: 'One pawn each, half-open files (most Sicilians). Both sides get their own file and their own attack. A race.',
        know: [
          'White often plays on the kingside, Black on the c-file — not a law, a default.',
          'The first one to land their break (e5 or …d5) usually wins the race.',
          'Do not mix a squeeze plan with a race plan.',
        ],
        items: [lab('sicilian_scheveningen')],
      },
      {
        id: 'tense-center',
        title: 'Tense center',
        why: 'Pawns touching, nothing traded (QGD before the break). Whoever resolves the tension first usually concedes something.',
        know: [
          'This is where “don’t release the tension” comes from.',
          'The first capture sets the rest of the game: Carlsbad, IQP, or hanging pawns.',
          'Improve pieces before you take.',
        ],
        items: [lab('qgd_tense')],
      },
      {
        id: 'outposts',
        title: 'Outposts and holes',
        why: 'A hole is a square no pawn can kick. Knights live there. Structure decides which pieces are good before you count anything.',
        know: [
          'Locked chains → knights. Open diagonals → bishops.',
          'A bishop blocked by its own pawns is bad. Put it outside the chain or change the structure.',
          'Rooks belong on the files the pawn breaks will open.',
        ],
        items: [lab('london_d5', 'London and e5'), phaseDrill('middlegame', 'Drill middlegame leaks')],
      },
      {
        id: 'breaks',
        title: 'Pawn breaks',
        why: 'Each structure has one or two legal breaks per side. The middlegame is who executes theirs first — or whether the position opens at all.',
        know: [
          'Name the break before you play moves: b4-b5, …e5, …c5, …d5, …f5, e5.',
          'A break that is “always the plan” can still be the wrong moment.',
          'If their break lands first, your extra space often does not matter.',
        ],
        items: [lab('carlsbad', 'Drill Carlsbad breaks')],
      },
      {
        id: 'trades',
        title: 'When to trade',
        why: 'Often the single most important decision. Structure tells you whether to keep pieces or take them off.',
        know: [
          'IQP: owner keeps pieces, defender trades.',
          'Wing majority: you want the ending (a passer).',
          'Attacking: do not trade your attacking pieces for their idle ones.',
        ],
        items: [lab('iqp_white', 'IQP: keep or trade')],
      },
    ],
  },
  {
    id: 'endgames',
    name: 'Endgames',
    kicker: 'Technique',
    nodes: [
      {
        id: 'king-pawn',
        title: 'King and pawn',
        why: 'Opposition, square of the pawn, shouldering. If you cannot convert this, the rest of the map is decoration.',
        know: [
          'Square of the pawn: if the king can step into the square, it catches the pawn.',
          'Shouldering: use your king to keep theirs out, not just to escort the pawn.',
          'A rook pawn is the exception — the defending king on the corner often draws.',
        ],
        items: [endgameLeaks('pawn', 'Your king-and-pawn leaks')],
        tag: { type: 'phase', phase: 'endgame' },
      },
      {
        id: 'opposition',
        title: 'Opposition',
        why: 'Kings facing with one square between. The side that does not have to move often takes the key squares.',
        know: [
          'Direct, distant, and diagonal opposition are the same idea at different distances.',
          'Outflanking: when opposition is not enough, go around.',
          'Key squares in front of a pawn: occupy them with the king, then the pawn can go.',
        ],
        items: [endgameLeaks('pawn', 'Your pawn-ending leaks')],
      },
      {
        id: 'rook-endings',
        title: 'Rook endings',
        why: 'The most common ending. Activity beats a pawn. Rooks belong behind passed pawns — yours and theirs.',
        know: [
          'Tarrasch: rook behind the passer.',
          'A passive rook on the back rank defending pawns is how these are lost.',
          'Checks from the long side, cut the king off on a rank or file.',
        ],
        items: [endgameLeaks('rook', 'Your rook-ending leaks')],
      },
      {
        id: 'lucena',
        title: 'Lucena and Philidor',
        why: 'The two rook-and-pawn positions you actually must know: building a bridge vs the third-rank defense.',
        know: [
          'Lucena: king in front of the pawn, bridge with the rook on the 4th, pawn queens.',
          'Philidor: defending rook on the 3rd (6th) rank until the pawn reaches the 6th, then checks from behind.',
          'If you mix the two, you convert a draw into a loss.',
        ],
        items: [endgameLeaks('rook', 'Your rook-ending leaks')],
      },
      {
        id: 'minor-piece',
        title: 'Minor-piece endings',
        why: 'Good knight vs bad bishop is a structure result. Opposite bishops draw; same-color bishops win with a passer.',
        know: [
          'Opposite-colored bishops: put pawns on the color they cannot eat, or accept the draw.',
          'Knight vs bishop: closed / outposts favor the knight; two wings favor the bishop.',
          'Wrong bishop + rook pawn does not queen if the defending king reaches the corner.',
        ],
        items: [endgameLeaks('minor', 'Your minor-piece leaks')],
      },
      {
        id: 'conversion',
        title: 'Conversion',
        why: 'You were winning. The leak is not the tactic — it is the technique. Drill the games you already had.',
        know: [
          'When ahead, trade pieces, not pawns — usually.',
          'Do not give them a fortress or a perpetual for “activity.”',
          'If the engine says +3 and you drew, this node is the leak, not “middlegame.”',
        ],
        items: [phaseDrill('endgame', 'Your endgame leaks')],
        tag: { type: 'phase', phase: 'endgame' },
      },
    ],
  },
]

export function allRoadmapNodes(): RoadmapNode[] {
  return ROADMAP_TRACKS.flatMap((track) => track.nodes)
}

export function roadmapNodeById(id: string): RoadmapNode | null {
  return allRoadmapNodes().find((node) => node.id === id) ?? null
}
