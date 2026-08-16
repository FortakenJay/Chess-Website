import { Chess } from 'chess.js'
import type { Tables } from '@/lib/supabase/database.types'

const FILES = 'abcdefgh'

export type StructureId =
  | 'carlsbad'
  | 'iqp_white'
  | 'iqp_black'
  | 'maroczy'
  | 'hedgehog'
  | 'french_advance'
  | 'stonewall_white'
  | 'stonewall_black'
  | 'kid_closed'
  | 'benoni'
  | 'grunfeld_exchange'
  | 'slav'
  | 'qgd_tense'
  | 'sicilian_scheveningen'
  | 'catalan'
  | 'london_d5'

export type PawnReq = {
  w: string[]
  b: string[]
  wAbsent?: string[]
  bAbsent?: string[]
}

export type StructureLesson = {
  whitePlan: string
  blackPlan: string
  attackDirection: string
  weaknesses: string
  pieces: string
  breaks: string
  endgame: string
}

export type StructureEdge = {
  via: string
  to: StructureId
}

export type StructureBreakDrill = {
  id: string
  structureId: StructureId
  fen: string
  prompt: string
  breakChoices: string[]
  correctBreak: string
  momentReady: boolean
  momentWhy: string
}

export type PawnStructure = {
  id: StructureId
  name: string
  moveOrder: string[]
  must: PawnReq
  lesson: StructureLesson
  edges: StructureEdge[]
}

function fenAfter(sans: string[]): string {
  const board = new Chess()
  for (const san of sans) {
    const played = board.move(san)
    if (!played) throw new Error(`Illegal structure line move ${san}`)
  }
  return board.fen()
}

export function pawnsFromFen(fen: string): { w: Set<string>; b: Set<string> } {
  const placement = fen.split(' ')[0] ?? ''
  const w = new Set<string>()
  const b = new Set<string>()
  let rank = 8
  let file = 0
  for (const ch of placement) {
    if (ch === '/') {
      rank -= 1
      file = 0
      continue
    }
    if (ch >= '1' && ch <= '8') {
      file += Number(ch)
      continue
    }
    const square = `${FILES[file]}${rank}`
    if (ch === 'P') w.add(square)
    if (ch === 'p') b.add(square)
    file += 1
  }
  return { w, b }
}

/** Hashable pawn-only key. Pieces, clocks, and castling are stripped. */
export function pawnStructureKey(fen: string): string {
  const { w, b } = pawnsFromFen(fen)
  const join = (squares: Set<string>) => [...squares].sort().join(',')
  return `w:${join(w)}|b:${join(b)}`
}

/** FEN with only pawns left. react-chessboard v5 wants a FEN string, not a square→'wP' map. */
export function pawnOnlyFen(fen: string): string {
  const { w, b } = pawnsFromFen(fen)
  const turn = fen.split(' ')[1] === 'b' ? 'b' : 'w'
  const ranks: string[] = []
  for (let rank = 8; rank >= 1; rank -= 1) {
    let empty = 0
    let row = ''
    for (const file of FILES) {
      const square = `${file}${rank}`
      const piece = w.has(square) ? 'P' : b.has(square) ? 'p' : ''
      if (piece) {
        if (empty) {
          row += String(empty)
          empty = 0
        }
        row += piece
      } else {
        empty += 1
      }
    }
    if (empty) row += String(empty)
    ranks.push(row)
  }
  return `${ranks.join('/')} ${turn} - - 0 1`
}

function scoreStructure(pawns: { w: Set<string>; b: Set<string> }, must: PawnReq): number | null {
  for (const square of must.w) {
    if (!pawns.w.has(square)) return null
  }
  for (const square of must.b) {
    if (!pawns.b.has(square)) return null
  }
  for (const square of must.wAbsent ?? []) {
    if (pawns.w.has(square)) return null
  }
  for (const square of must.bAbsent ?? []) {
    if (pawns.b.has(square)) return null
  }
  return must.w.length + must.b.length + (must.wAbsent?.length ?? 0) + (must.bAbsent?.length ?? 0)
}

export const PAWN_STRUCTURES: PawnStructure[] = [
  {
    id: 'carlsbad',
    name: 'Carlsbad',
    moveOrder: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'O-O', 'Bd3', 'Nbd7', 'Qc2', 'c6'],
    must: { w: ['d4', 'e3'], b: ['d5', 'c6'], wAbsent: ['c4'], bAbsent: ['e6', 'e5'] },
    lesson: {
      whitePlan: 'Minority attack with b4-b5. The job is to make c6 and d5 weak, then sit on them.',
      blackPlan: 'Central ...e5 break, or kingside piece play (...Ne4, ...Bd6) before the queenside caves in.',
      attackDirection: 'White’s remaining chain leans queenside (b-pawn). Black’s d5-c6 chain points at White’s center/kingside counterplay.',
      weaknesses: 'c6 becomes backward if b5 lands. d5 is a long-term target. White’s e3 can sag if Black gets ...e5 in cleanly.',
      pieces: 'Knights like the c4/e5 outposts. Black’s light-squared bishop is the problem child after ...c6. Rooks belong on the b- and c-files for White, e-file for Black.',
      breaks: 'White: b4-b5. Black: ...e5 or ...c5. Do not rush ...c5 if it leaves d5 isolated without activity.',
      endgame: 'If pieces come off, White’s minority-attack rook ending vs a weak c6 is the conversion path. Black should keep pieces if the center stays tense.',
    },
    edges: [
      { via: '...c5 and trades on d4', to: 'iqp_white' },
      { via: 'before cxd5, tension held', to: 'qgd_tense' },
    ],
  },
  {
    id: 'iqp_white',
    name: 'Isolated Queen’s Pawn',
    moveOrder: ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5', 'O-O', 'cxd4', 'exd4'],
    must: { w: ['d4'], b: ['e6'], wAbsent: ['c3', 'c4', 'c2', 'e3', 'e4', 'e2'] },
    lesson: {
      whitePlan: 'Attack now. Piece activity, the d5 outpost, and kingside pressure pay the rent on the isolated pawn.',
      blackPlan: 'Trade pieces, blockade d5, and head for the endgame where the IQP is a target, not a weapon.',
      attackDirection: 'White plays through the center and kingside (f-file, b1-h7 diagonal). Black chips at d4 and the squares in front of it.',
      weaknesses: 'd4 is isolated — no neighboring pawns. The square in front (d5) is a permanent outpost for Black if a piece lands there.',
      pieces: 'Bishops love the open diagonals. White’s knights want d5. Black’s knights want d5 too — whoever owns d5 owns the structure. Trade queens if you are defending.',
      breaks: 'White: d5, opening the position while pieces are still on. Black: ...e5 only if it does not hang d5, otherwise just blockade.',
      endgame: 'IQP is a middlegame asset and an endgame liability. If you own it, avoid piece trades. If you face it, trade toward a king-and-pawn ending.',
    },
    edges: [
      { via: 'd5 break and recapture', to: 'qgd_tense' },
      { via: 'Black blockades and trades', to: 'iqp_white' },
    ],
  },
  {
    id: 'iqp_black',
    name: 'Isolated Queen’s Pawn (Black)',
    moveOrder: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'c5', 'cxd5', 'exd5', 'Nf3', 'Nc6', 'g3', 'Nf6', 'Bg2', 'Be7', 'O-O', 'O-O', 'dxc5', 'Bxc5'],
    must: { w: [], b: ['d5'], wAbsent: ['d4'], bAbsent: ['c6', 'c7', 'c5', 'e6', 'e5', 'e7'] },
    lesson: {
      whitePlan: 'Blockade d4, trade pieces, and farm the isolated pawn in the ending.',
      blackPlan: 'Use the open files and the d4 outpost to attack before the ending arrives.',
      attackDirection: 'Black through the center and kingside. White toward the isolated d-pawn.',
      weaknesses: 'Black’s d5 is isolated. d4 is the blockade square.',
      pieces: 'Same as the White IQP, colors flipped. Knights on the blockade square beat roaming bishops once pieces come off.',
      breaks: 'Black: ...d4 while activity is high. White: refuse to open more lines.',
      endgame: 'Defender trades; owner keeps pieces.',
    },
    edges: [{ via: 'color-flipped IQP', to: 'iqp_white' }],
  },
  {
    id: 'maroczy',
    name: 'Maróczy Bind',
    moveOrder: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'g6', 'c4', 'Bg7', 'Nc3', 'd6'],
    must: { w: ['c4', 'e4'], b: ['d6'], wAbsent: ['d4'], bAbsent: ['c5', 'd5'] },
    lesson: {
      whitePlan: 'Squeeze. The c4+e4 clamp prevents ...b5 and ...d5. Improve pieces, then crack the queenside or the dark squares.',
      blackPlan: 'Play for exactly those two breaks: ...b5 and ...d5. Until one lands, sit in a slightly worse but solid shell.',
      attackDirection: 'White’s space points queenside and center. Black’s counterplay is the same two breaks, not a kingside storm.',
      weaknesses: 'd5 and b5 are holes Black wants to occupy. White’s d4 square is often a knight outpost. If White overextends, c4 can become a target.',
      pieces: 'White knights belong on d5/c3. Black’s dark-squared bishop is the long-term asset. Rooks: c-file for both, d-file once ...d5 is prepared.',
      breaks: 'White rarely needs a pawn break — the bind is the plan. Black: ...b5 or ...d5, prepared with ...a6/...Bd7 or ...e6/...Ne5.',
      endgame: 'If Black never breaks, White’s space converts. If ...d5 lands and pieces come off, the bind dissolves into a normal Sicilian ending.',
    },
    edges: [
      { via: '...d6 and ...e6 without the bind', to: 'sicilian_scheveningen' },
      { via: '...b5 or ...d5 exploding the clamp', to: 'hedgehog' },
    ],
  },
  {
    id: 'hedgehog',
    name: 'Hedgehog',
    moveOrder: ['c4', 'c5', 'Nf3', 'Nf6', 'Nc3', 'e6', 'g3', 'b6', 'Bg2', 'Bb7', 'O-O', 'a6', 'd4', 'cxd4', 'Qxd4', 'd6'],
    must: { w: ['c4'], b: ['a6', 'b6', 'd6', 'e6'], bAbsent: ['c5', 'd5'] },
    lesson: {
      whitePlan: 'Keep the clamp. Do not let ...b5 or ...d5 land for free. Space is the whole advantage.',
      blackPlan: 'Coil on the first three ranks, then explode with ...b5 or ...d5 when the tactics justify it.',
      attackDirection: 'Not a chain — a spring. Black’s breaks are queenside (...b5) and center (...d5). White presses the same squares from above.',
      weaknesses: 'Black’s d6 and e6 can become backward if the explosion is mistimed. White’s extra space includes holes on d3/c3 if the queen wanders.',
      pieces: 'Black’s bishops wait on b7 and e7. Knights reroute to d7. White’s knights want d5. Rooks: c- and d-files, both sides.',
      breaks: 'Black: ...b5 or ...d5 — the whole middlegame is the timing of those two. White: prevent them, or meet them with trades that leave Black’s remaining pawns weak.',
      endgame: 'If Black never breaks, the squeeze wins. If the position opens, Black’s bishops become the story.',
    },
    edges: [
      { via: 'White also has e4', to: 'maroczy' },
      { via: '...d5 and recapture with a pawn', to: 'iqp_white' },
    ],
  },
  {
    id: 'french_advance',
    name: 'French Advance',
    moveOrder: ['e4', 'e6', 'd4', 'd5', 'e5'],
    must: { w: ['d4', 'e5'], b: ['d5', 'e6'], wAbsent: ['e4'], bAbsent: ['e5'] },
    lesson: {
      whitePlan: 'The chain d4-e5 points at the kingside. Attack there. The bad bishop on c1 still needs a job (Be3-Qd2 or b3-Ba3).',
      blackPlan: 'The chain e6-d5 points at the queenside. Hit the base with ...c5, then ...Nc6 and pressure d4.',
      attackDirection: 'White kingside, Black queenside — because that is where each chain gives space, not because of a memorized line.',
      weaknesses: 'd4 is the base of White’s chain (the target). e6 can become a hole if Black plays ...f6 carelessly. White’s light-squared bishop is “bad” behind e5.',
      pieces: 'Locked chain → knights and outposts (d4, e5, f4 / c4, c5, f5). Bishops need the chains to open or a different diagonal. Rooks: c-file for Black, f-file if ...f6 happens.',
      breaks: 'Black: ...c5 (thematic), later ...f6 to chip e5. White: rarely c4; more often piece attack. Timing of ...f6 is the trap — too early and e6/g6 sag.',
      endgame: 'If the chains stay, good knight vs bad bishop is a common conversion. If ...c5 and trades blow the center, the game becomes an open-file race.',
    },
    edges: [
      { via: '...c5 and a closed c-file', to: 'french_advance' },
      { via: 'exd5 Exchange French (open e-file)', to: 'qgd_tense' },
    ],
  },
  {
    id: 'stonewall_white',
    name: 'Stonewall (White)',
    moveOrder: ['d4', 'd5', 'e3', 'Nf6', 'Bd3', 'c5', 'c3', 'Nc6', 'f4'],
    must: { w: ['d4', 'e3', 'f4'], b: ['d5'] },
    lesson: {
      whitePlan: 'Same chain logic as the French: attack where the pawns point (kingside). Ne5 is the signature outpost. The bad bishop on c1 needs b3-Ba3 or a later e4.',
      blackPlan: 'Chip the head of the wall (...c5) and the dark squares White just weakened (e4). Trade the Ne5.',
      attackDirection: 'White’s f4-e3-d4 chain points kingside. Black hits the base and the dark-square holes.',
      weaknesses: 'e4 is a hole. c1 bishop is bad. If f4-f5 never comes, f4 is just a weakness.',
      pieces: 'Knights >> bishops until the wall breaks. White’s queen bishop is the problem piece. Rooks lift to the kingside.',
      breaks: 'White: f5 or e4. Black: ...c5 and ...e5. The wall is only good if the attack lands first.',
      endgame: 'Bad bishop vs good knight if the wall stays. If e4 opens it, bishops recover.',
    },
    edges: [{ via: 'colors flipped Dutch Stonewall', to: 'stonewall_black' }],
  },
  {
    id: 'stonewall_black',
    name: 'Stonewall (Black)',
    moveOrder: ['d4', 'f5', 'c4', 'Nf6', 'g3', 'e6', 'Bg2', 'd5', 'Nf3', 'c6'],
    must: { w: ['d4'], b: ['d5', 'e6', 'f5', 'c6'] },
    lesson: {
      whitePlan: 'Own e5, trade Black’s good bishop, and farm the dark squares.',
      blackPlan: 'Ne4, kingside attack, and only break with ...e5 if the pieces justify opening the wall.',
      attackDirection: 'Black’s chain points at White’s king. White chips at e5 and the queenside.',
      weaknesses: 'e5 hole. c8 bishop trapped behind the wall. e6 can hang if ...f4 is mistimed.',
      pieces: 'Black’s good bishop is the light-squared one (often ...Bd6). Knights on e4. White wants a knight on e5.',
      breaks: 'Black: ...e5 or a piece attack without a pawn break. White: e4 or cxd5 then a minority idea.',
      endgame: 'Wall stays → knight endings favor the side with the outpost. Wall breaks → the “bad” bishop becomes a piece again.',
    },
    edges: [{ via: 'French Advance is the cousin chain', to: 'french_advance' }],
  },
  {
    id: 'kid_closed',
    name: 'King’s Indian (closed)',
    moveOrder: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'd5'],
    must: { w: ['c4', 'd5', 'e4'], b: ['d6', 'e5'], wAbsent: ['d4'], bAbsent: ['e7', 'd5'] },
    lesson: {
      whitePlan: 'The chain points queenside. Play c5, expand with b4, and crack the c-file before Black’s kingside lands.',
      blackPlan: 'The chain points kingside. Play ...f5, lift pieces, and race. ...f4 + ...g5 is the storm, not a decoration.',
      attackDirection: 'White c5, Black f5 — because that is where each side’s chain gives space.',
      weaknesses: 'White’s king can get stormed. Black’s queenside (c7/c8) can collapse if c5 lands first. d6 is backward on a closed file.',
      pieces: 'Knights on c4/e4 (White) and f4/e5 (Black). Black’s g7 bishop is tall pawn until the center opens. Rooks: c-file White, f-file Black.',
      breaks: 'White: c5. Black: ...f5. Whoever is slower usually loses the race, not the “better structure.”',
      endgame: 'If the storms miss, White’s space on the queenside converts. Rarely a quiet ending — this structure is a race.',
    },
    edges: [{ via: '...exd4 instead of a closed d5', to: 'grunfeld_exchange' }],
  },
  {
    id: 'benoni',
    name: 'Benoni',
    moveOrder: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'exd5', 'cxd5', 'd6', 'e4'],
    must: { w: ['d5', 'e4'], b: ['c5', 'd6'], wAbsent: ['c4', 'd4'], bAbsent: ['e6', 'd5'] },
    lesson: {
      whitePlan: 'Central space and e4-e5. Keep Black’s queenside majority from rolling.',
      blackPlan: 'Queenside majority (...a6/...b5) and dark-square play. The g7 bishop is the piece the whole opening is for.',
      attackDirection: 'White through the center (e5). Black on the queenside (b5) and the long diagonal.',
      weaknesses: 'd6 is backward. e4 can become a target. White’s d5 pawn is a wedge or a weakness depending on whether e5 lands.',
      pieces: 'Black’s fianchetto bishop is the asset. White knights want c4/e4. Rooks: e-file White, b-file Black.',
      breaks: 'White: e5. Black: ...b5, sometimes ...f5. Timing of e5 vs ...b5 is the game.',
      endgame: 'Black’s queenside majority wants a passer. White’s central wedge wants to keep pieces on until the bind tells.',
    },
    edges: [{ via: 'no ...e6, King’s Indian closed instead', to: 'kid_closed' }],
  },
  {
    id: 'grunfeld_exchange',
    name: 'Grünfeld Exchange',
    moveOrder: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3'],
    must: { w: ['c3', 'd4', 'e4'], b: ['g6'], wAbsent: ['c2', 'c4'], bAbsent: ['d5', 'd7'] },
    lesson: {
      whitePlan: 'The big center is real space — until Black proves it is a target. Hold d4/e4, develop, and do not let the center collapse.',
      blackPlan: 'Hypermodern: ...c5 and ...Bg7 hit d4. The center is the target, not something to copy.',
      attackDirection: 'Black at the white center. White through the center and sometimes the kingside if the center holds.',
      weaknesses: 'c3 and d4 can become hanging pawns or an IQP after ...cxd4. If White overextends e5, d5 is a hole.',
      pieces: 'Black’s g7 bishop is the sniper. White’s bishops want the open diagonals behind the pawn center. Rooks: c- and d-files.',
      breaks: 'Black: ...c5, later ...e5 or ...f5. White: e5 only when it does not drop the center.',
      endgame: 'If the center is traded into an IQP, see that lesson. If it holds, White’s extra space converts.',
    },
    edges: [
      { via: '...cxd4 and recapture with c-pawn', to: 'iqp_white' },
      { via: 'center stays broad', to: 'grunfeld_exchange' },
    ],
  },
  {
    id: 'slav',
    name: 'Slav',
    moveOrder: ['d4', 'd5', 'c4', 'c6'],
    must: { w: ['d4', 'c4'], b: ['d5', 'c6'], bAbsent: ['e5'] },
    lesson: {
      whitePlan: 'Pressure d5, take space, and decide whether to take on d5 or keep the tension.',
      blackPlan: 'Hold d5 without boxing the light-squared bishop (the whole point of ...c6 over ...e6).',
      attackDirection: 'Both sides still in a tense d4-d5 structure. Breaks will decide the wing.',
      weaknesses: 'If Black takes ...dxc4 too early, White’s center rolls. If White takes cxd5, it can become Exchange Slav (dead equal) or a Carlsbad cousin.',
      pieces: 'Black’s c8 bishop can get out. Knights on f3/c3 and f6/d7. Rooks still waiting on the c-file.',
      breaks: 'White: cxd5 or e4. Black: ...dxc4 then ...b5, or ...c5 later.',
      endgame: 'Exchange Slav is a notorious draw. Keep pieces if you need a result.',
    },
    edges: [
      { via: 'cxd5 exd5 with ...c6', to: 'carlsbad' },
      { via: 'tension held with ...e6', to: 'qgd_tense' },
    ],
  },
  {
    id: 'qgd_tense',
    name: 'QGD (tense)',
    moveOrder: ['d4', 'd5', 'c4', 'e6'],
    must: { w: ['d4', 'c4'], b: ['d5', 'e6'], wAbsent: ['e5'], bAbsent: ['c5', 'f5'] },
    lesson: {
      whitePlan: 'Keep the tension until a capture improves your pieces. Do not gift Black a free ...c5.',
      blackPlan: 'Hold d5, develop, and only release with ...c5 or ...dxc4 when the bishop on c8 has a future.',
      attackDirection: 'Not yet. This is the “don’t release the tension” structure. The first capture sets the rest of the game.',
      weaknesses: 'Whoever takes first usually concedes a file or a square. c4 and d5 are the loaded pawns.',
      pieces: 'Bishops still finding diagonals. Knights on c3/f3 vs f6/d7. Rooks want the c-file after the first trade.',
      breaks: 'White: cxd5 (Carlsbad) or e4. Black: ...c5, ...dxc4. The whole opening is which of those happens.',
      endgame: 'Depends entirely on which structure you transpose into.',
    },
    edges: [
      { via: 'cxd5 exd5', to: 'carlsbad' },
      { via: '...dxc4 and later IQP', to: 'iqp_white' },
    ],
  },
  {
    id: 'sicilian_scheveningen',
    name: 'Sicilian (d6+e6)',
    moveOrder: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e6'],
    must: { w: ['e4'], b: ['d6', 'e6'], wAbsent: ['d4', 'c4'], bAbsent: ['c5', 'c7'] },
    lesson: {
      whitePlan: 'Kingside attack (f4-f5 or g4-g5) using the half-open d-file as the other theater. This is a race.',
      blackPlan: 'Queenside counterplay on the c-file, ...a6/...b5, and the classic ...d5 break when it equalizes on the spot.',
      attackDirection: 'Fixed/semi-open center: White on the kingside, Black on the c-file. Both sides have their own attack.',
      weaknesses: 'd6 can be backward. e6 can sag after f4-f5. White’s e4 is a target for ...Nc6-b4 or ...d5.',
      pieces: 'Knights on d4 (White) and c6/d7 (Black). Bishops often stay behind the pawn walls until the race opens. Rooks: d-file White, c-file Black.',
      breaks: 'White: f4-f5 or e5. Black: ...d5 (the equalizer) or ...b5. Whoever is slower loses a race, not a squeeze.',
      endgame: 'If ...d5 lands and pieces come off, equality. If the kingside attack hits first, there is no ending.',
    },
    edges: [
      { via: 'White adds c4', to: 'maroczy' },
      { via: 'Black coils a6/b6', to: 'hedgehog' },
    ],
  },
  {
    id: 'catalan',
    name: 'Catalan',
    moveOrder: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2'],
    must: { w: ['d4', 'c4', 'g3'], b: ['d5', 'e6'], bAbsent: ['f5'] },
    lesson: {
      whitePlan: 'Long-diagonal pressure from g2. Keep tension, then pick on queenside pawns if Black takes ...dxc4.',
      blackPlan: 'Hold the center or take ...dxc4 and challenge the Catalan bishop with ...c5 / ...b5.',
      attackDirection: 'White down the h1-a8 diagonal and the c-file. Black in the center with ...c5.',
      weaknesses: 'c4 can hang. Black’s queenside can get picked if the bishop stays unopposed.',
      pieces: 'The g2 bishop is the opening. Black’s c8 bishop is still the QGD problem. Rooks: c-file.',
      breaks: 'White: cxd5 or Ne5. Black: ...c5 or ...dxc4.',
      endgame: 'Catalan bishop vs queenside pawns is a long grind. Keep that bishop.',
    },
    edges: [
      { via: 'cxd5 exd5', to: 'carlsbad' },
      { via: '...dxc4 and isolated d-pawn', to: 'iqp_white' },
    ],
  },
  {
    id: 'london_d5',
    name: 'London vs ...d5',
    moveOrder: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'],
    must: { w: ['d4'], b: ['d5'], wAbsent: ['c4', 'e5'] },
    lesson: {
      whitePlan: 'Solid triangle (c3-d4-e3), control e5, and a slow kingside or central squeeze. Low theory, high structure.',
      blackPlan: '...c5 and ...Qb6 hit b2/d4. Do not let White’s knight sit on e5 for free.',
      attackDirection: 'Closed-ish center, play on the c-file and e5. Not a race.',
      weaknesses: 'b2 is tender if the bishop left c1. e5 is the outpost both sides contest.',
      pieces: 'London bishop on f4 is the signature. Knights on e5/d7. Rooks: c-file after ...c5.',
      breaks: 'White: e4 or Ne5. Black: ...c5, sometimes ...e5.',
      endgame: 'Very playable for both. Structure stays; plans stay.',
    },
    edges: [{ via: 'c4 added, it becomes a QGD', to: 'qgd_tense' }],
  },
]

const BY_SPECIFICITY = [...PAWN_STRUCTURES].sort((a, b) => {
  const musts = (s: PawnStructure) => s.must.w.length + s.must.b.length
  const absents = (s: PawnStructure) => (s.must.wAbsent?.length ?? 0) + (s.must.bAbsent?.length ?? 0)
  return musts(b) - musts(a) || absents(b) - absents(a)
})

export function structureById(id: StructureId): PawnStructure {
  const found = PAWN_STRUCTURES.find((row) => row.id === id)
  if (!found) throw new Error(`Unknown structure ${id}`)
  return found
}

export function isStructureId(value: string): value is StructureId {
  return PAWN_STRUCTURES.some((row) => row.id === value)
}

export function structureDisplayFen(structure: PawnStructure): string {
  return fenAfter(structure.moveOrder)
}

export function matchPawnStructure(fen: string): StructureId | null {
  const pawns = pawnsFromFen(fen)
  for (const structure of BY_SPECIFICITY) {
    if (scoreStructure(pawns, structure.must) != null) return structure.id
  }
  return null
}

const OPENING_NAME_TO_STRUCTURE: Array<{ test: RegExp; id: StructureId }> = [
  { test: /carlsbad|exchange.*queen'?s gambit declined|queen'?s gambit declined.*exchange/, id: 'carlsbad' },
  { test: /isolated|tarrasch|queen'?s gambit accepted/, id: 'iqp_white' },
  { test: /mar[oó]czy/, id: 'maroczy' },
  { test: /hedgehog/, id: 'hedgehog' },
  { test: /french.*advance|advance.*french/, id: 'french_advance' },
  { test: /stonewall/, id: 'stonewall_black' },
  { test: /king'?s indian/, id: 'kid_closed' },
  { test: /benoni/, id: 'benoni' },
  { test: /gr[uü]nfeld/, id: 'grunfeld_exchange' },
  { test: /\bslav\b/, id: 'slav' },
  { test: /catalan/, id: 'catalan' },
  { test: /london/, id: 'london_d5' },
  { test: /queen'?s gambit declined|orthodox/, id: 'qgd_tense' },
  { test: /sicilian/, id: 'sicilian_scheveningen' },
]

const ECO_TO_STRUCTURE: Array<{ letter: string; from: number; to: number; id: StructureId }> = [
  { letter: 'D', from: 35, to: 36, id: 'carlsbad' },
  { letter: 'D', from: 20, to: 29, id: 'iqp_white' },
  { letter: 'D', from: 10, to: 19, id: 'slav' },
  { letter: 'D', from: 30, to: 42, id: 'qgd_tense' },
  { letter: 'D', from: 70, to: 99, id: 'grunfeld_exchange' },
  { letter: 'E', from: 60, to: 99, id: 'kid_closed' },
  { letter: 'E', from: 20, to: 59, id: 'qgd_tense' },
  { letter: 'B', from: 36, to: 39, id: 'maroczy' },
  { letter: 'B', from: 80, to: 99, id: 'sicilian_scheveningen' },
  { letter: 'B', from: 20, to: 99, id: 'sicilian_scheveningen' },
  { letter: 'C', from: 2, to: 2, id: 'french_advance' },
  { letter: 'C', from: 0, to: 19, id: 'french_advance' },
  { letter: 'A', from: 43, to: 79, id: 'benoni' },
  { letter: 'A', from: 80, to: 99, id: 'stonewall_black' },
  { letter: 'A', from: 10, to: 39, id: 'hedgehog' },
]

export function structureFromOpening(name: string | null, eco: string | null): StructureId | null {
  const hay = name?.toLowerCase() ?? ''
  for (const row of OPENING_NAME_TO_STRUCTURE) {
    if (hay && row.test.test(hay)) return row.id
  }
  const code = eco?.trim().toUpperCase() ?? ''
  const letter = code[0]
  const num = Number.parseInt(code.slice(1), 10)
  if (!letter || !Number.isFinite(num)) return null
  for (const row of ECO_TO_STRUCTURE) {
    if (row.letter === letter && num >= row.from && num <= row.to) return row.id
  }
  return null
}

export type StructureLeak = {
  id: StructureId
  name: string
  games: number
  wins: number
  draws: number
  leaks: number
}

export function structureLeaks(
  games: Array<Pick<Tables<'games'>, 'opening_name' | 'opening_eco' | 'result'>>,
  positions: Array<Pick<Tables<'flagged_positions'>, 'fen_before' | 'phase'>>,
): StructureLeak[] {
  const rows = new Map<StructureId, StructureLeak>()
  function row(id: StructureId): StructureLeak {
    const current = rows.get(id)
    if (current) return current
    const created: StructureLeak = {
      id,
      name: structureById(id).name,
      games: 0,
      wins: 0,
      draws: 0,
      leaks: 0,
    }
    rows.set(id, created)
    return created
  }

  for (const game of games) {
    const id = structureFromOpening(game.opening_name, game.opening_eco)
    if (!id) continue
    const next = row(id)
    next.games += 1
    if (game.result === 'win') next.wins += 1
    if (game.result === 'draw') next.draws += 1
  }
  for (const position of positions) {
    if (position.phase === 'endgame') continue
    const id = matchPawnStructure(position.fen_before)
    if (!id) continue
    row(id).leaks += 1
  }

  return [...rows.values()].sort((a, b) => b.leaks - a.leaks || b.games - a.games)
}

export const STRUCTURE_DRILLS: StructureBreakDrill[] = [
  {
    id: 'carlsbad-b5',
    structureId: 'carlsbad',
    fen: fenAfter(['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'O-O', 'Bd3', 'Nbd7', 'Qc2', 'c6', 'Nf3', 'Re8', 'O-O', 'Nf8', 'Rab1', 'a5']),
    prompt: 'Carlsbad, White to move. Which break is the plan?',
    breakChoices: ['b4-b5', 'e4', 'c4', '...e5'],
    correctBreak: 'b4-b5',
    momentReady: false,
    momentWhy: 'Black already played ...a5. b4 still comes, but you need a3 first so b4 is supported. The break is right; this exact moment is not.',
  },
  {
    id: 'carlsbad-e5',
    structureId: 'carlsbad',
    fen: fenAfter(['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'O-O', 'Bd3', 'Nbd7', 'Qc2', 'c6', 'Nge2', 'Re8', 'O-O', 'Nf8']),
    prompt: 'Carlsbad, Black to move. Which break fights the minority attack?',
    breakChoices: ['...e5', '...c5', '...b5', '...f5'],
    correctBreak: '...e5',
    momentReady: true,
    momentWhy: 'Pieces are developed, the e-file is ready, and White has not rolled b4-b5 yet. ...e5 is the central counter before the queenside lands.',
  },
  {
    id: 'iqp-d5',
    structureId: 'iqp_white',
    fen: fenAfter(['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5', 'O-O', 'cxd4', 'exd4', 'Be7', 'Nc3', 'O-O', 'Re1', 'Nc6']),
    prompt: 'White IQP. Which break uses the isolated pawn as a weapon?',
    breakChoices: ['d5', 'c5', 'e5', 'b4'],
    correctBreak: 'd5',
    momentReady: true,
    momentWhy: 'Pieces are out, Black has not blockaded d5 yet, and opening the position favors the more active side — the IQP owner.',
  },
  {
    id: 'maroczy-d5',
    structureId: 'maroczy',
    fen: fenAfter(['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'g6', 'c4', 'Bg7', 'Nc3', 'd6', 'Be3', 'Nf6', 'Be2', 'O-O', 'O-O', 'Bd7']),
    prompt: 'Maróczy Bind, Black to move. Which break cracks the clamp?',
    breakChoices: ['...d5', '...e5', '...f5', '...c5'],
    correctBreak: '...d5',
    momentReady: false,
    momentWhy: '...d5 (or ...b5) is the thematic break, but the pieces are not ready — d5 is still covered more times than you attack it. Prepare, then break.',
  },
  {
    id: 'hedgehog-b5',
    structureId: 'hedgehog',
    fen: fenAfter(['c4', 'c5', 'Nf3', 'Nf6', 'Nc3', 'e6', 'g3', 'b6', 'Bg2', 'Bb7', 'O-O', 'a6', 'd4', 'cxd4', 'Qxd4', 'd6', 'Rd1', 'Nbd7', 'b3', 'Be7']),
    prompt: 'Hedgehog, Black to move. Which explosion is on the table?',
    breakChoices: ['...b5', '...e5', '...c5', '...g5'],
    correctBreak: '...b5',
    momentReady: false,
    momentWhy: 'The hedgehog explodes with ...b5 or ...d5. Here ...b5 still needs more preparation (...Qc7, ...Rac8) so the tactics work after the pawn lands.',
  },
  {
    id: 'french-c5',
    structureId: 'french_advance',
    fen: fenAfter(['e4', 'e6', 'd4', 'd5', 'e5', 'c5']),
    prompt: 'French Advance. Black just had a free hand. Which break is correct?',
    breakChoices: ['...c5', '...f6', '...e5', '...b5'],
    correctBreak: '...c5',
    momentReady: true,
    momentWhy: '...c5 hits the base of White’s chain (d4) on the first chance. ...f6 is the later chip, not the first break.',
  },
  {
    id: 'kid-f5',
    structureId: 'kid_closed',
    fen: fenAfter(['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'd5', 'a5', 'O-O', 'Na6', 'Ne1', 'Nd7']),
    prompt: 'Closed KID. Black to move. Where does the chain tell you to break?',
    breakChoices: ['...f5', '...c5', '...b5', '...d5'],
    correctBreak: '...f5',
    momentReady: true,
    momentWhy: 'White closed with d5. Black’s chain points kingside, so ...f5 is the break — and the knight has already unblocked f7.',
  },
]

export function drillsFor(structureId: StructureId | 'all'): StructureBreakDrill[] {
  if (structureId === 'all') return STRUCTURE_DRILLS
  const scoped = STRUCTURE_DRILLS.filter((drill) => drill.structureId === structureId)
  return scoped.length ? scoped : STRUCTURE_DRILLS
}
