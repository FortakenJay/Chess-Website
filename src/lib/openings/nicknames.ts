export type OpeningNickname = {
  keys: string[]
  expand: string
  title: string
  name: string
  eco: string
  moves: string
  featured?: boolean
}

/** Club names people actually type, mapped to the main line they usually mean. */
export const OPENING_NICKNAMES: OpeningNickname[] = [
  {
    keys: ['accelerated dragon'],
    expand: 'sicilian accelerated dragon',
    title: 'Accelerated Dragon',
    name: 'Sicilian Defense: Accelerated Dragon',
    eco: 'B34',
    moves: '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 g6',
  },
  {
    keys: ['dragon', 'sicilian dragon'],
    expand: 'sicilian dragon',
    title: 'Dragon',
    name: 'Sicilian Defense: Dragon Variation',
    eco: 'B70',
    moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6',
    featured: true,
  },
  {
    keys: ['najdorf', 'sicilian najdorf'],
    expand: 'sicilian najdorf',
    title: 'Najdorf',
    name: 'Sicilian Defense: Najdorf Variation',
    eco: 'B90',
    moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6',
    featured: true,
  },
  {
    keys: ['sveshnikov'],
    expand: 'sicilian sveshnikov',
    title: 'Sveshnikov',
    name: 'Sicilian Defense: Open, Sveshnikov Variation',
    eco: 'B33',
    moves: '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e5',
  },
  {
    keys: ['fried liver'],
    expand: 'fried liver',
    title: 'Fried Liver',
    name: 'Italian Game: Two Knights Defense, Fried Liver Attack',
    eco: 'C57',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5',
    featured: true,
  },
  {
    keys: ['italian', 'giuoco', 'giuoco piano', 'piano'],
    expand: 'italian giuoco piano',
    title: 'Italian',
    name: 'Italian Game: Giuoco Piano',
    eco: 'C50',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5',
    featured: true,
  },
  {
    keys: ['spanish', 'ruy', 'ruy lopez'],
    expand: 'ruy lopez',
    title: 'Spanish',
    name: 'Ruy Lopez: Morphy Defense',
    eco: 'C78',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6',
    featured: true,
  },
  {
    keys: ['berlin'],
    expand: 'ruy lopez berlin',
    title: 'Berlin',
    name: 'Ruy Lopez: Berlin Defense',
    eco: 'C65',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6',
  },
  {
    keys: ['scotch'],
    expand: 'scotch',
    title: 'Scotch',
    name: 'Scotch Game',
    eco: 'C45',
    moves: '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4',
  },
  {
    keys: ['vienna'],
    expand: 'vienna',
    title: 'Vienna',
    name: 'Vienna Game, Vienna Gambit',
    eco: 'C29',
    moves: '1. e4 e5 2. Nc3 Nf6 3. f4',
    featured: true,
  },
  {
    keys: ['french'],
    expand: 'french defense',
    title: 'French',
    name: 'French Defense: Advance Variation',
    eco: 'C02',
    moves: '1. e4 e6 2. d4 d5 3. e5',
    featured: true,
  },
  {
    keys: ['caro', 'caro kann', 'carokann'],
    expand: 'caro-kann',
    title: 'Caro-Kann',
    name: 'Caro-Kann Defense',
    eco: 'B12',
    moves: '1. e4 c6 2. d4 d5',
    featured: true,
  },
  {
    keys: ['scandi', 'scandinavian', 'center counter'],
    expand: 'scandinavian',
    title: 'Scandinavian',
    name: 'Scandinavian Defense',
    eco: 'B01',
    moves: '1. e4 d5',
  },
  {
    keys: ['london'],
    expand: 'london system',
    title: 'London',
    name: "Queen's Pawn Game: London System",
    eco: 'D02',
    moves: '1. d4 d5 2. Nf3 Nf6 3. Bf4',
    featured: true,
  },
  {
    keys: ['qgd', 'queens gambit declined'],
    expand: "queen's gambit declined",
    title: "Queen's Gambit Declined",
    name: "Queen's Gambit Declined",
    eco: 'D30',
    moves: '1. d4 d5 2. c4 e6',
  },
  {
    keys: ['qga', 'queens gambit accepted'],
    expand: "queen's gambit accepted",
    title: "Queen's Gambit Accepted",
    name: "Queen's Gambit Accepted",
    eco: 'D20',
    moves: '1. d4 d5 2. c4 dxc4',
  },
  {
    keys: ['slav'],
    expand: 'slav defense',
    title: 'Slav',
    name: 'Slav Defense',
    eco: 'D10',
    moves: '1. d4 d5 2. c4 c6',
  },
  {
    keys: ['kid', 'kings indian', "king's indian"],
    expand: "king's indian",
    title: "King's Indian",
    name: "King's Indian Defense",
    eco: 'E60',
    moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7',
    featured: true,
  },
  {
    keys: ['nimzo', 'nimzo indian'],
    expand: 'nimzo-indian',
    title: 'Nimzo-Indian',
    name: 'Nimzo-Indian Defense',
    eco: 'E20',
    moves: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4',
  },
  {
    keys: ['grunfeld', 'grünfeld'],
    expand: 'grunfeld',
    title: 'Grünfeld',
    name: 'Grünfeld Defense',
    eco: 'D80',
    moves: '1. d4 Nf6 2. c4 g6 3. Nc3 d5',
  },
]

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function distanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let skipped = false
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1
      j += 1
      continue
    }
    if (skipped) return false
    skipped = true
    if (a.length > b.length) i += 1
    else if (b.length > a.length) j += 1
    else {
      i += 1
      j += 1
    }
  }
  return true
}

export function matchNickname(query: string): OpeningNickname | null {
  const needle = normalize(query)
  if (needle.length < 2) return null
  const ranked = [...OPENING_NICKNAMES].sort(
    (a, b) => Math.max(...b.keys.map((key) => key.length)) - Math.max(...a.keys.map((key) => key.length)),
  )
  for (const nick of ranked) {
    for (const key of nick.keys) {
      const normalizedKey = normalize(key)
      if (
        needle === normalizedKey ||
        needle.startsWith(`${normalizedKey} `) ||
        (needle.length >= 4 && normalizedKey.startsWith(needle)) ||
        (normalizedKey.length >= 5 && needle.includes(normalizedKey))
      ) {
        return nick
      }
    }
  }
  if (needle.length < 5) return null
  for (const nick of ranked) {
    for (const key of nick.keys) {
      const normalizedKey = normalize(key)
      if (normalizedKey.length >= 5 && distanceAtMostOne(needle, normalizedKey)) return nick
    }
  }
  return null
}

export function expandSearchQuery(query: string): string {
  const nick = matchNickname(query)
  return nick?.expand ?? query.trim()
}

export function nicknameCanonical(query: string): OpeningNickname | null {
  return matchNickname(query)
}

export function humanOpeningLabel(name: string, eco?: string | null): { title: string; hint: string } {
  const nick = OPENING_NICKNAMES.find(
    (row) =>
      row.name.toLowerCase() === name.toLowerCase() ||
      (eco && row.eco === eco && name.toLowerCase().includes(row.title.toLowerCase())),
  )
  if (nick) return { title: nick.title, hint: name }
  const colon = name.indexOf(':')
  if (colon > 0) {
    const head = name.slice(0, colon).trim()
    const rest = name.slice(colon + 1).trim()
    const variation = rest.split(',')[0]?.trim().replace(/\s*variation$/i, '') ?? rest
    return { title: variation || head, hint: head }
  }
  const comma = name.indexOf(',')
  if (comma > 0) return { title: name.slice(comma + 1).trim() || name, hint: name.slice(0, comma).trim() }
  return { title: name, hint: eco ?? '' }
}

export const FEATURED_OPENING_CHIPS = OPENING_NICKNAMES.filter((row) => row.featured).map((row) => row.title)
