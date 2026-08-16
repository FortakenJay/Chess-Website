import { describe, expect, it } from 'vitest'
import { emptyStrategyStats } from './analysis/types'
import { filterGamesByTimeClass, strategyFromGames, timeClassFilterOptions } from './strategyStats'
import type { Tables } from './supabase/database.types'

function game(partial: Partial<Tables<'games'>>): Tables<'games'> {
  return {
    id: '1',
    username: 'sakenetal',
    played_on: '2026-08-01',
    opponent: 'opp',
    color: 'white',
    result: 'win',
    blunder_count: 0,
    mistake_count: 0,
    inaccuracy_count: 0,
    total_moves: 20,
    phase_stats: {},
    clock_stats: {},
    game_link: 'https://example.com/1',
    quality_stats: {},
    acpl: 20,
    accuracy_pct: 80,
    phase_acpl: {},
    endgame_stats: {},
    endgame_conversion: {},
    recovery_stats: {},
    opening_eco: null,
    opening_name: null,
    time_class: 'blitz',
    opponent_rating: 1200,
    user_rating: 1200,
    move_ep_losses: [],
    analysis_budget: null,
    strategy_stats: null,
    endgame_accuracy_stats: null,
    analysis_version: null,
    ...partial,
  }
}

describe('time-class filtering', () => {
  const games = [
    game({ id: '1', time_class: 'blitz', game_link: 'a' }),
    game({ id: '2', time_class: 'rapid', game_link: 'b' }),
    game({ id: '3', time_class: '10|0', game_link: 'c' }),
  ]

  it('keeps every game for overall', () => {
    expect(filterGamesByTimeClass(games, 'all')).toHaveLength(3)
  })

  it('groups Chess.com time controls onto canonical labels', () => {
    expect(filterGamesByTimeClass(games, 'rapid')).toHaveLength(2)
    expect(filterGamesByTimeClass(games, 'blitz')).toHaveLength(1)
  })

  it('lists overall first, then present canonical types', () => {
    expect(timeClassFilterOptions(games).map((option) => option.value)).toEqual([
      'all',
      'blitz',
      'rapid',
    ])
  })
})

describe('strategy rollup', () => {
  it('sums stored accuracy buckets', () => {
    const stats = emptyStrategyStats()
    stats.all.attacking.moves = 4
    stats.all.attacking.squaredError = 400
    const games = [
      game({ strategy_stats: stats as unknown as Tables<'games'>['strategy_stats'] }),
    ]
    const rolled = strategyFromGames(games)
    expect(rolled.all.attacking.moves).toBe(4)
    expect(rolled.all.attacking.squaredError).toBe(400)
  })
})
