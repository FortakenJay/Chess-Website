import type { Motif, Phase } from '@/lib/analysis/types'
import thresholds from '@/lib/analysis/phaseThresholds.json'
import maps from './lichessThemeMaps.json'

/** Our motifs → Lichess puzzle theme angles (API `angle`). */
export const MOTIF_TO_LICHESS: Partial<Record<Motif, string>> = {
  hanging_piece: 'hangingPiece',
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discovered_attack: 'discoveredAttack',
  back_rank: 'backRankMate',
  missed_mate: 'mate',
  missed_fork: 'fork',
  missed_pin: 'pin',
  missed_skewer: 'skewer',
  missed_discovered_attack: 'discoveredAttack',
  missed_hanging_piece: 'hangingPiece',
  missed_back_rank: 'backRankMate',
}

export const PHASE_TO_LICHESS: Record<Phase, string> = {
  opening: 'opening',
  middlegame: 'middlegame',
  endgame: 'endgame',
}

const LICHESS_TO_MOTIF = maps.toMotif as Record<string, Motif>

export const LICHESS_BATCH_ANGLES = maps.angles

/** Themes kept when downloading / filtering the Lichess CSV dump. */
export const IMPORT_LICHESS_THEMES = maps.importThemes

export function motifFromLichessThemes(themes: string[]): Motif | null {
  for (const theme of themes) {
    const motif = LICHESS_TO_MOTIF[theme]
    if (motif) return motif
  }
  return null
}

export function phaseFromLichessThemes(themes: string[], fallback: Phase): Phase {
  if (themes.includes('opening')) return 'opening'
  if (themes.includes('endgame') || themes.some((t) => t.endsWith('Endgame'))) return 'endgame'
  if (themes.includes('middlegame')) return 'middlegame'
  return fallback
}

/** Fen-only phase fallback (no chess.js) — thresholds shared with analysis/phase.ts. */
export function phaseFromFen(fen: string): Phase {
  const moveNumber = Number(fen.split(' ')[5] ?? '1') || 1
  if (moveNumber <= thresholds.openingMoveMax) return 'opening'
  const placement = fen.split(' ')[0] ?? ''
  let score = 0
  for (const ch of placement) {
    const lower = ch.toLowerCase()
    if (lower === 'q') score += 9
    else if (lower === 'r') score += 5
    else if (lower === 'b' || lower === 'n') score += 3
  }
  return score <= thresholds.endgameNonPawnMax ? 'endgame' : 'middlegame'
}

export function lichessAngle(filters: { phase?: Phase | ''; motif?: Motif | '' }) {
  if (filters.motif) return MOTIF_TO_LICHESS[filters.motif] ?? 'mix'
  if (filters.phase) return PHASE_TO_LICHESS[filters.phase]
  return 'mix'
}
