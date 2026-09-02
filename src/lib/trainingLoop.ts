import type { Motif, Phase } from '@/lib/analysis/types'
import { learnInsteadQuery } from '@/lib/openings/openingScore'
import { MOTIF_LABEL, PHASE_LABEL, type Headline } from '@/lib/stats'

export type LoopGame = {
  opening_name: string | null
  opening_eco: string | null
  result: string | null
  color: string | null
}

export type LoopPosition = {
  phase: string | null
}

export type LoopLink =
  | { to: '/drill/$username'; search: { phase?: Phase; motif?: Motif; order: 'worst' } }
  | { to: '/trainer/$username'; search: { tab: 'theory' | 'learn' | 'endgames' | 'foundations' } }
  | { to: '/puzzles/$username' }
  | { to: '/review/$username' }
  | { to: '/roadmap/$username' }

export type LoopAction = LoopLink & { label: string }

export type LoopStep = {
  id: 'drill' | 'opening' | 'puzzles' | 'endgame' | 'review'
  kicker: string
  title: string
  body: string
  primary: LoopAction
  secondary?: LoopAction
}

export type OpeningLeak = {
  name: string
  eco: string | null
  side: 'w' | 'b'
  games: number
  winPct: number
  leakWeight: number
}

function winPct(wins: number, games: number) {
  return games ? Math.round((1000 * wins) / games) / 10 : 0
}

/** Highest volume-weighted WR shortfall among named openings with ≥5 games. */
export function worstOpeningLeak(games: LoopGame[]): OpeningLeak | null {
  const buckets = new Map<string, OpeningLeak & { wins: number }>()
  for (const game of games) {
    const name = game.opening_name?.trim()
    if (!name) continue
    const side: 'w' | 'b' = game.color === 'black' ? 'b' : 'w'
    const eco = game.opening_eco?.trim().toUpperCase() || null
    const key = `${side}|${eco ?? ''}|${name.toLowerCase()}`
    const row = buckets.get(key) ?? {
      name,
      eco,
      side,
      games: 0,
      wins: 0,
      winPct: 0,
      leakWeight: 0,
    }
    row.games += 1
    if (game.result === 'win') row.wins += 1
    buckets.set(key, row)
  }

  let worst: OpeningLeak | null = null
  for (const row of buckets.values()) {
    if (row.games < 5) continue
    const pct = winPct(row.wins, row.games)
    const leakWeight = row.games * Math.max(0, 50 - pct)
    if (leakWeight <= 0) continue
    const next = { name: row.name, eco: row.eco, side: row.side, games: row.games, winPct: pct, leakWeight }
    if (!worst || next.leakWeight > worst.leakWeight) worst = next
  }
  return worst
}

/**
 * Lotus/product loop as ordered next actions. Same routes, one home.
 * Import stays on Sync; this is the post-analysis walk.
 */
export function trainingLoop(input: {
  headline: Headline | null
  games: LoopGame[]
  positions: LoopPosition[]
}): LoopStep[] {
  const steps: LoopStep[] = []
  const leak = worstOpeningLeak(input.games)
  const instead = leak ? learnInsteadQuery({ name: leak.name, eco: leak.eco }) : null
  const endgameFlags = input.positions.filter((row) => row.phase === 'endgame').length

  if (input.headline) {
    const motif = input.headline.topMotif
    steps.push({
      id: 'drill',
      kicker: 'Guess before reveal',
      title: `${PHASE_LABEL[input.headline.phase]} is the leak`,
      body: motif
        ? `${input.headline.errorPct}% blunders or mistakes. ${MOTIF_LABEL[motif]} is the tagged pattern. Hide the answer, then move.`
        : `${input.headline.errorPct}% blunders or mistakes in this phase. Guess the move before the engine speaks.`,
      primary: {
        label: `Drill ${PHASE_LABEL[input.headline.phase].toLowerCase()}`,
        to: '/drill/$username',
        search: {
          phase: input.headline.phase,
          motif: motif ?? undefined,
          order: 'worst',
        },
      },
    })
  } else {
    steps.push({
      id: 'drill',
      kicker: 'Guess before reveal',
      title: 'Open the leaked positions',
      body: 'Not enough moves in one phase for a headline yet. Hide the answer, then move.',
      primary: {
        label: 'Open drills',
        to: '/drill/$username',
        search: { order: 'worst' },
      },
    })
  }

  if (leak) {
    const side = leak.side === 'b' ? 'Black' : 'White'
    steps.push({
      id: 'opening',
      kicker: 'Your repertoire',
      title: `${leak.name} scores ${leak.winPct}%`,
      body: `${leak.games} games as ${side}. That is game result, not an engine eval. Theory drills the line you already play.${
        instead ? ` Learn ${instead} if you want a different system in the same family.` : ''
      }`,
      primary: {
        label: 'Train this line',
        to: '/trainer/$username',
        search: { tab: 'theory' },
      },
      secondary: instead
        ? { label: `Learn ${instead}`, to: '/trainer/$username', search: { tab: 'learn' } }
        : { label: 'Learn a new opening', to: '/trainer/$username', search: { tab: 'learn' } },
    })
  } else {
    steps.push({
      id: 'opening',
      kicker: 'Learn a line',
      title: 'Pick a named system people actually play',
      body: 'Walk the mainline, then master it from memory. Frequency first — not a 150ms engine flip.',
      primary: {
        label: 'Learn an opening',
        to: '/trainer/$username',
        search: { tab: 'learn' },
      },
      secondary: {
        label: 'Foundations first',
        to: '/trainer/$username',
        search: { tab: 'foundations' },
      },
    })
  }

  steps.push({
    id: 'puzzles',
    kicker: 'Tactics',
    title: 'Puzzles at your rating',
    body: 'Keep openings from eating the whole session. Catalog tactics, then play on with the engine if you want.',
    primary: { label: 'Solve puzzles', to: '/puzzles/$username' },
  })

  steps.push({
    id: 'endgame',
    kicker: 'Convert',
    title: endgameFlags ? `${endgameFlags} leaked endings` : 'Technique before the next game',
    body: endgameFlags
      ? 'Drill the positions you already had, then convert a study FEN against a club-strength engine.'
      : 'Opposition, Lucena, conversion. Playing a game does not mark a node done.',
    primary: endgameFlags
      ? {
          label: 'Drill these endings',
          to: '/drill/$username',
          search: { phase: 'endgame', order: 'worst' },
        }
      : { label: 'Convert vs engine', to: '/trainer/$username', search: { tab: 'endgames' } },
    secondary: endgameFlags
      ? { label: 'Convert vs engine', to: '/trainer/$username', search: { tab: 'endgames' } }
      : { label: 'Open the roadmap', to: '/roadmap/$username' },
  })

  steps.push({
    id: 'review',
    kicker: 'Close the loop',
    title: 'Review a recent game',
    body: 'Mark engine leaks and repertoire misses on a RAM tape. Nothing is written. Then come back here.',
    primary: { label: 'Review games', to: '/review/$username' },
  })

  return steps
}
