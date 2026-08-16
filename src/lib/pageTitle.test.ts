import { describe, expect, it } from 'vitest'
import { pageTitle, playerTitle, sessionTitle, sessionWho } from './pageTitle'

describe('pageTitle', () => {
  it('falls back to the brand', () => {
    expect(pageTitle()).toBe('leak')
    expect(pageTitle('', null)).toBe('leak')
  })

  it('joins page, player, and brand', () => {
    expect(playerTitle('Drill', 'Hikaru')).toBe('Drill · hikaru · leak')
    expect(playerTitle('Roadmap', 'Hikaru', 'Italian')).toBe('Roadmap · Italian · hikaru · leak')
  })

  it('uses the linked handle on your own library', () => {
    expect(sessionWho('Hikaru', 'hikaru')).toBe('hikaru')
    expect(sessionTitle({ page: 'Drill', library: 'Hikaru', you: 'hikaru', activity: 'Fork' })).toBe(
      'Fork · Drill · hikaru · leak',
    )
  })

  it('keeps the route player when you are looking at someone else', () => {
    expect(sessionWho('hikaru', 'michele')).toBe('hikaru')
    expect(sessionTitle({ page: 'Results', library: 'hikaru', you: 'michele' })).toBe(
      'Results · hikaru · leak',
    )
  })
})
