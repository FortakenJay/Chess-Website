import type { EndgameEntry } from '@/lib/analysis/types'

export function gradeForAccuracy(accuracy: number | null) {
  if (accuracy == null) return '—'
  if (accuracy >= 90) return 'A+'
  if (accuracy >= 85) return 'A'
  if (accuracy >= 78) return 'B'
  if (accuracy >= 70) return 'C'
  if (accuracy >= 60) return 'D'
  return 'F'
}

export function gradeForConversion(pct: number | null, entry: EndgameEntry) {
  if (pct == null) return '—'
  if (entry === 'better') {
    if (pct >= 92) return 'A+'
    if (pct >= 85) return 'A'
    if (pct >= 75) return 'B'
    if (pct >= 65) return 'C'
    if (pct >= 50) return 'D'
    return 'F'
  }
  if (entry === 'equal') {
    if (pct >= 60) return 'A+'
    if (pct >= 52) return 'A'
    if (pct >= 45) return 'B'
    if (pct >= 35) return 'C'
    if (pct >= 25) return 'D'
    return 'F'
  }
  if (pct >= 20) return 'A+'
  if (pct >= 15) return 'A'
  if (pct >= 10) return 'B'
  if (pct >= 6) return 'C'
  if (pct >= 3) return 'D'
  return 'F'
}

export function formatPct(value: number | null) {
  return value == null ? '—' : `${value.toFixed(1)}%`
}
