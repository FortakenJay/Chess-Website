import { describe, expect, it } from 'vitest'
import { dateKey, inTimeframe, timeframeStart } from './stats'

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
