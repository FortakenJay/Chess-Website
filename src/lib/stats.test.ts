import { describe, expect, it } from 'vitest'
import { dateKey, inTimeframe, openingRepertoire, timeframeStart } from './stats'
import type { Tables } from './supabase/database.types'

function game(partial: Partial<Tables<'games'>>): Tables<'games'> {
  return {
    id: '1',
    username: 't',
    played_on: '2026-08-01',
    opponent: 'x',
    color: 'white',
    result: 'win',
    blunder_count: 0,
    mistake_count: 0,
    inaccuracy_count: 0,
    total_moves: 40,
    phase_stats: { opening: { total: 10, blunder: 0, mistake: 1, inaccuracy: 0 } },
    clock_stats: null,
    quality_stats: null,
    move_ep_losses: null,
    analysis_budget: null,
    acpl: 20,
    accuracy_pct: 80,
    phase_acpl: null,
    endgame_stats: null,
    endgame_conversion: null,
    endgame_accuracy_stats: null,
    strategy_stats: null,
    analysis_version: 1,
    recovery_stats: null,
    opening_eco: 'C50',
    opening_name: 'Italian Game',
    time_class: 'blitz',
    opponent_rating: 1500,
    user_rating: 1500,
    game_link: 'https://example.com/1',
    created_at: '2026-08-01',
    ...partial,
  } as Tables<'games'>
}

describe('timeframe filters', () => {
  const saturday = new Date(2026, 7, 15, 0, 10) // local Sat Aug 15

  it('treats this week as the last 7 local days', () => {
    expect(timeframeStart('week', saturday)).toBe('2026-08-09')
    expect(inTimeframe('2026-08-14', 'week', saturday)).toBe(true)
    expect(inTimeframe('2026-08-09', 'week', saturday)).toBe(true)
    expect(inTimeframe('2026-08-08', 'week', saturday)).toBe(false)
  })

  it('keeps this month on the local first of the month', () => {
    expect(timeframeStart('month', saturday)).toBe('2026-08-01')
    expect(inTimeframe('2026-08-14', 'month', saturday)).toBe(true)
    expect(inTimeframe('2026-07-31', 'month', saturday)).toBe(false)
  })

  it('reads ISO timestamps and Date values as calendar days', () => {
    expect(dateKey('2026-08-14T23:10:00.000Z')).toBe('2026-08-14')
    expect(inTimeframe('2026-08-14T18:00:00.000Z', 'week', saturday)).toBe(true)
  })
})

describe('opening repertoire', () => {
  it('keeps white and black lines in separate lists', () => {
    const mixed = [
      game({ opening_name: 'Italian Game', color: 'white' }),
      game({
        opening_name: 'Sicilian Defense',
        opening_eco: 'B20',
        color: 'black',
        game_link: 'https://example.com/2',
      }),
    ]
    expect(openingRepertoire(mixed.filter((row) => row.color === 'white')).map((row) => row.name)).toEqual([
      'Italian Game',
    ])
    expect(openingRepertoire(mixed.filter((row) => row.color === 'black')).map((row) => row.name)).toEqual([
      'Sicilian Defense',
    ])
  })
})
