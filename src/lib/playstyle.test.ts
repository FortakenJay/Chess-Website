import { describe, expect, it } from 'vitest'
import { emptyStrategyStats, type StrategyStats } from './analysis/types'
import { playstyleFrom, thriveCopy } from './playstyle'
import type { Tables } from './supabase/database.types'
import type { ClockStats, ColorStats } from './analysis/types'

function bucket(moves: number, accuracy: number) {
  const rms = 100 - accuracy
  return { moves, squaredError: rms * rms * moves }
}

function withStructures(stats: StrategyStats, open: number, closed: number, semi: number, moves = 80) {
  stats.open.overall = bucket(moves, open)
  stats.closed.overall = bucket(moves, closed)
  stats.semi_closed.overall = bucket(moves, semi)
  stats.all.overall = bucket(moves * 3, (open + closed + semi) / 3)
  return stats
}

function game(partial: Partial<Tables<'games'>> = {}): Tables<'games'> {
  return {
    id: '1',
    username: 't',
    played_on: '2026-08-01',
    opponent: 'x',
    color: 'white',
    result: 'win',
    blunder_count: 1,
    mistake_count: 1,
    inaccuracy_count: 0,
    total_moves: 40,
    phase_stats: {},
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

function flag(partial: Partial<Tables<'flagged_positions'>>): Tables<'flagged_positions'> {
  return {
    id: 'p1',
    username: 't',
    played_on: '2026-08-01',
    opponent: 'x',
    color: 'white',
    move_number: 12,
    san: 'Qxf7',
    loss: 200,
    classification: 'blunder',
    quality: 'blunder',
    motif: 'hanging_piece',
    motif_kind: 'commission',
    fen_before: '8/8/8/8/8/8/8/8 w - - 0 1',
    game_link: 'https://example.com/1',
    phase: 'middlegame',
    clock_left: 60,
    endgame_type: null,
    time_class: 'blitz',
    ...partial,
  } as Tables<'flagged_positions'>
}

describe('playstyleFrom', () => {
  const color: ColorStats = {
    white: { total: 80, blunder: 4, mistake: 4, inaccuracy: 4 },
    black: { total: 80, blunder: 10, mistake: 10, inaccuracy: 4 },
  }
  const clock: ClockStats = {
    lt30: { total: 40, blunder: 8, mistake: 4, inaccuracy: 2 },
    '30_60': { total: 40, blunder: 2, mistake: 2, inaccuracy: 2 },
    gt60: { total: 40, blunder: 1, mistake: 1, inaccuracy: 2 },
  }

  it('says you thrive more on the higher-accuracy center type', () => {
    const stats = withStructures(emptyStrategyStats(), 82, 70, 74)
    const playstyle = playstyleFrom(
      [game({ strategy_stats: stats as unknown as Tables<'games'>['strategy_stats'] })],
      [],
      color,
      clock,
    )
    expect(playstyle?.thrive).toMatchObject({ best: 'open', versus: 'closed' })
    expect(playstyle?.thrive?.percentMore).toBeGreaterThanOrEqual(10)
    expect(thriveCopy(playstyle!)).toMatch(/open positions than closed/i)
  })

  it('ignores a structure with too few moves', () => {
    const stats = emptyStrategyStats()
    stats.open.overall = bucket(80, 88)
    stats.closed.overall = bucket(8, 50)
    stats.semi_closed.overall = bucket(80, 80)
    const playstyle = playstyleFrom(
      [game({ strategy_stats: stats as unknown as Tables<'games'>['strategy_stats'] })],
      [],
      color,
      clock,
    )
    expect(playstyle?.structures.find((row) => row.id === 'closed')?.accuracy).toBeNull()
    expect(playstyle?.thrive?.versus).not.toBe('closed')
  })

  it('names cleaner color and time-trouble leaks', () => {
    const playstyle = playstyleFrom([game()], [], color, clock)
    const colorTrait = playstyle?.traits.find((trait) => trait.id === 'color')
    expect(colorTrait?.label).toMatch(/White/)
    expect(colorTrait?.value).toBe('15.0 pt')
    expect(playstyle?.traits.some((trait) => trait.id === 'clock')).toBe(true)
    expect(playstyle?.traits.find((trait) => trait.id === 'clock')?.value).toBe('30.0%')
  })

  it('does not call a 0.9-point color gap a playstyle', () => {
    const playstyle = playstyleFrom(
      [game()],
      [],
      {
        white: { total: 1000, blunder: 50, mistake: 41, inaccuracy: 0 },
        black: { total: 1000, blunder: 40, mistake: 42, inaccuracy: 0 },
      },
      clock,
    )
    expect(playstyle?.traits.some((trait) => trait.id === 'color')).toBe(false)
  })

  it('rounds color gaps instead of leaking float noise', () => {
    const playstyle = playstyleFrom(
      [game()],
      [],
      {
        white: { total: 1000, blunder: 40, mistake: 21, inaccuracy: 0 },
        black: { total: 1000, blunder: 50, mistake: 41, inaccuracy: 0 },
      },
      { lt30: { total: 0, blunder: 0, mistake: 0, inaccuracy: 0 }, '30_60': { total: 0, blunder: 0, mistake: 0, inaccuracy: 0 }, gt60: { total: 0, blunder: 0, mistake: 0, inaccuracy: 0 } },
    )
    expect(playstyle?.traits.find((trait) => trait.id === 'color')?.value).toBe('3.0 pt')
  })

  it('says center types play even when accuracies are close', () => {
    const stats = withStructures(emptyStrategyStats(), 80, 79, 80.5)
    const playstyle = playstyleFrom(
      [game({ strategy_stats: stats as unknown as Tables<'games'>['strategy_stats'] })],
      [],
      color,
      clock,
    )
    expect(playstyle?.thrive).toBeNull()
    expect(thriveCopy(playstyle!)).toBe('Those center types play about even.')
  })

  it('uses tagged leaks to separate hanging vs missing tactics', () => {
    const flags = Array.from({ length: 12 }, (_, i) =>
      flag({
        id: `p${i}`,
        motif: i < 8 ? 'missed_fork' : 'hanging_piece',
        motif_kind: i < 8 ? 'omission' : 'commission',
      }),
    )
    const playstyle = playstyleFrom([game()], flags, color, clock)
    expect(playstyle?.traits.some((trait) => trait.label.includes('Misses'))).toBe(true)
  })

  it('does not call a coin-flip miss/hang split a playstyle', () => {
    const flags = Array.from({ length: 30 }, (_, i) =>
      flag({
        id: `p${i}`,
        motif: i < 17 ? 'missed_fork' : 'hanging_piece',
        motif_kind: i < 17 ? 'omission' : 'commission',
      }),
    )
    const playstyle = playstyleFrom([game()], flags, color, clock)
    expect(playstyle?.traits.some((trait) => trait.id === 'tactics')).toBe(false)
  })

  it('does not call a 2-point structure/space gap a playstyle', () => {
    const stats = emptyStrategyStats()
    stats.all.pawnStructure = bucket(80, 77.1)
    stats.all.space = bucket(80, 74.9)
    const playstyle = playstyleFrom(
      [game({ strategy_stats: stats as unknown as Tables<'games'>['strategy_stats'] })],
      [],
      color,
      clock,
    )
    expect(playstyle?.traits.some((trait) => trait.id === 'plan')).toBe(false)
  })
})
