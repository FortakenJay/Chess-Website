export type TrainedColor = 'w' | 'b'

export type OpeningFamilyId =
  | 'open_game'
  | 'semi_open'
  | 'closed_game'
  | 'semi_closed'
  | 'flank'

export type CenterLessonId = 'open' | 'closed' | 'fixed' | 'tense'

export type OpeningFamily = {
  id: OpeningFamilyId
  name: string
  firstMoves: string
  examples: string[]
}

export const OPENING_FAMILIES: OpeningFamily[] = [
  {
    id: 'open_game',
    name: 'Open Game',
    firstMoves: '1.e4 e5',
    examples: ['Italian', 'Spanish', 'Scotch', 'Vienna', "King's Gambit", 'Petrov'],
  },
  {
    id: 'semi_open',
    name: 'Semi-Open',
    firstMoves: '1.e4 + anything else',
    examples: ['Sicilian', 'Najdorf', 'Dragon', 'French', 'Caro-Kann', 'Pirc', 'Scandinavian'],
  },
  {
    id: 'closed_game',
    name: 'Closed Game',
    firstMoves: '1.d4 d5',
    examples: ['QGD', 'QGA', 'Slav', 'Catalan', 'London vs d5'],
  },
  {
    id: 'semi_closed',
    name: 'Semi-Closed',
    firstMoves: '1.d4 + anything else',
    examples: ['KID', 'Nimzo', 'QID', 'Grünfeld', 'Benoni', 'Dutch'],
  },
  {
    id: 'flank',
    name: 'Flank',
    firstMoves: '1.c4, 1.Nf3, 1.b3, 1.g3, 1.b4',
    examples: ['English', 'Réti', 'Larsen', "Bird's"],
  },
]

export const CENTER_LESSONS: Array<{
  id: CenterLessonId
  name: string
  example: string
  body: string
}> = [
  {
    id: 'open',
    name: 'Open center',
    example: 'Scotch, Exchange French',
    body: 'Pawns traded off. Piece activity and initiative decide it. Develop fast, castle, open files for rooks. King safety is critical because tactics come immediately. Time beats material.',
  },
  {
    id: 'closed',
    name: 'Closed center',
    example: 'KID mainline, French Advance',
    body: 'Locked pawn chains freeze the center, so play shifts to the wings. Attack in the direction your pawn chain points. Slow maneuvering; knights often beat bishops. You can spend five moves repositioning a piece.',
  },
  {
    id: 'fixed',
    name: 'Fixed / semi-open center',
    example: 'Most Sicilians',
    body: 'One pawn each, half-open files. Asymmetrical: both sides get their own file and their own attack. Usually a race.',
  },
  {
    id: 'tense',
    name: 'Tense center',
    example: 'QGD before the break',
    body: 'Pawns touching, nothing traded yet. Whoever resolves the tension first usually concedes something. This is where “don’t release the tension” comes from.',
  },
]

export const COLOR_LESSONS: Record<
  TrainedColor,
  { headline: string; body: string; points: Array<{ title: string; body: string }> }
> = {
  w: {
    headline: 'White chooses the terrain.',
    body: '1.e4 tends to commit you to sharper, more forcing play with faster development but more theory. 1.d4 / 1.c4 / 1.Nf3 lets you steer into slower structural games where a small space edge lasts 40 moves. At club level: 1.e4 punishes a forgotten line harder; 1.d4 lets you get outplayed slowly if you don’t understand the structure.',
    points: [
      {
        title: '1.e4',
        body: 'Sharper, faster development, heavier theory. You get punished harder for forgetting a line.',
      },
      {
        title: '1.d4 / 1.c4 / 1.Nf3',
        body: 'Slower structures. A small space edge can last the whole game — if you know the plan.',
      },
    ],
  },
  b: {
    headline: 'Black chooses the character of the fight.',
    body: 'You decide whether the game stays equal-and-solid or becomes a real fight with imbalances.',
    points: [
      {
        title: 'Symmetrical / solid',
        body: '1...e5, 1...d5, Caro-Kann, Slav. Equalize first, play for a win later. Fewer imbalances, fewer chances both ways.',
      },
      {
        title: 'Asymmetrical / fighting',
        body: 'Sicilian, KID, Grünfeld, Benoni. Concede space or the center to get a counterattacking asset. Worse if you play badly; winning chances against equals.',
      },
      {
        title: 'Hypermodern',
        body: 'Grünfeld, Nimzo, KID. Let White build a big center, then attack it with pieces and pawn breaks (...c5, ...e5, ...f5). The big center is a target, not an asset.',
      },
    ],
  },
}

export function classifyOpeningFamily(
  eco: string | null,
  name: string,
): OpeningFamilyId | null {
  const code = eco?.trim().toUpperCase() ?? ''
  const letter = code[0]
  const num = Number.parseInt(code.slice(1), 10)
  if (letter && Number.isFinite(num)) {
    if (letter === 'C' && num >= 20) return 'open_game'
    if (letter === 'C' && num <= 19) return 'semi_open'
    if (letter === 'B') return 'semi_open'
    if (letter === 'D' && num <= 69) return 'closed_game'
    if (letter === 'D' && num >= 70) return 'semi_closed'
    if (letter === 'E') return 'semi_closed'
    if (letter === 'A') {
      if (num >= 4 && num <= 39) return 'flank'
      if (num >= 1 && num <= 3) return 'flank'
      return 'semi_closed'
    }
  }

  const hay = name.toLowerCase()
  if (
    /italian|spanish|ruy lopez|scotch|vienna|petrov|petroff|king'?s gambit|giuoco|two knights/.test(
      hay,
    )
  ) {
    return 'open_game'
  }
  if (/sicilian|french|caro|pirc|scandinavian|center counter|alekhine|modern defense/.test(hay)) {
    return 'semi_open'
  }
  if (/queen'?s gambit|slav|catalan|london|colle|jobava/.test(hay)) return 'closed_game'
  if (/indian|nimzo|gr[uü]nfeld|benoni|dutch|king'?s indian|bogo/.test(hay)) return 'semi_closed'
  if (/english|r[eé]ti|larsen|bird|sokolsky|polish/.test(hay)) return 'flank'
  return null
}

const SEARCH_ALIASES: Record<string, string> = {
  QGD: "Queen's Gambit Declined",
  QGA: "Queen's Gambit Accepted",
  KID: "King's Indian",
  QID: "Queen's Indian",
  Nimzo: 'Nimzo-Indian',
  'London vs d5': 'London',
  Spanish: 'Ruy Lopez',
  "Bird's": 'Bird',
  Dragon: 'Sicilian Dragon',
  Najdorf: 'Sicilian Najdorf',
}

export function openingSearchQuery(example: string): string {
  return SEARCH_ALIASES[example] ?? example
}

export function familyForOpening(opening: { eco: string | null; name: string } | null | undefined) {
  if (!opening?.name) return null
  const id = classifyOpeningFamily(opening.eco, opening.name)
  return OPENING_FAMILIES.find((family) => family.id === id) ?? null
}
