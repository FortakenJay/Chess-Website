import type { ClockBucket } from './types'

export function parseClk(comment: string | undefined | null): number | null {
  if (!comment) return null
  const match = comment.match(/%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (!match) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

export function clockBucket(seconds: number): ClockBucket {
  if (seconds < 30) return 'lt30'
  if (seconds < 60) return '30_60'
  return 'gt60'
}
