import { matchPawnStructure, structureFromOpening, type StructureId } from '@/lib/openings/structures'
import { allRoadmapNodes, type RoadmapNode, type RoadmapTag } from './topics'
import type { Tables } from '@/lib/supabase/database.types'

const STORAGE_VERSION = 1
const PREFIX = 'leak-roadmap-v1:'

export type RoadmapMarks = {
  version: number
  completed: string[]
}

export type NodeExposure = {
  games: number
  leaks: number
  solves: number
}

export function emptyMarks(): RoadmapMarks {
  return { version: STORAGE_VERSION, completed: [] }
}

export function readRoadmapMarks(username: string): RoadmapMarks {
  if (typeof window === 'undefined') return emptyMarks()
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${username.toLowerCase()}`)
    if (!raw) return emptyMarks()
    const parsed = JSON.parse(raw) as Partial<RoadmapMarks>
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.completed)) return emptyMarks()
    return { version: STORAGE_VERSION, completed: parsed.completed.filter((id) => typeof id === 'string') }
  } catch {
    return emptyMarks()
  }
}

export function writeRoadmapMarks(username: string, marks: RoadmapMarks) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    `${PREFIX}${username.toLowerCase()}`,
    JSON.stringify({ version: STORAGE_VERSION, completed: [...new Set(marks.completed)] }),
  )
}

export function toggleCompleted(marks: RoadmapMarks, nodeId: string): RoadmapMarks {
  const has = marks.completed.includes(nodeId)
  return {
    version: STORAGE_VERSION,
    completed: has ? marks.completed.filter((id) => id !== nodeId) : [...marks.completed, nodeId],
  }
}

type GameRow = Pick<Tables<'games'>, 'opening_name' | 'opening_eco'>
type PositionRow = Pick<Tables<'flagged_positions'>, 'id' | 'motif' | 'phase' | 'fen_before'>
type AttemptRow = Pick<Tables<'drill_attempts'>, 'position_id' | 'matched_best'>

function normalizeHay(value: string) {
  return value.toLowerCase().replace(/['’]/g, '')
}

export function ecoInSpec(eco: string | null | undefined, spec: string) {
  if (!eco || eco.length < 2) return false
  const letter = eco[0]!.toUpperCase()
  const num = Number.parseInt(eco.slice(1), 10)
  if (Number.isNaN(num)) return false
  return spec.split(',').some((part) => {
    const [startRaw, endRaw] = part.trim().split('-')
    if (!startRaw) return false
    const startLetter = startRaw[0]!.toUpperCase()
    const from = Number.parseInt(startRaw.slice(1), 10)
    const to = endRaw ? Number.parseInt(endRaw.slice(1), 10) : from
    if (Number.isNaN(from) || Number.isNaN(to)) return false
    return letter === startLetter && num >= from && num <= to
  })
}

export function matchesOpeningTag(
  game: GameRow,
  tag: Extract<RoadmapTag, { type: 'opening' }>,
) {
  if (ecoInSpec(game.opening_eco, tag.eco)) return true
  const hay = normalizeHay(game.opening_name ?? '')
  if (!hay) return false
  if (tag.exclude?.some((needle) => hay.includes(normalizeHay(needle)))) return false
  return tag.names.some((name) => hay.includes(normalizeHay(name)))
}

function structureIdsFor(id: StructureId): StructureId[] {
  if (id === 'iqp_white' || id === 'iqp_black') return ['iqp_white', 'iqp_black']
  return [id]
}

export function roadmapExposure(
  games: GameRow[],
  positions: PositionRow[],
  attempts: AttemptRow[],
  nodes: RoadmapNode[] = allRoadmapNodes(),
): Map<string, NodeExposure> {
  const byId = new Map(positions.map((row) => [row.id, row]))
  const motifLeaks = new Map<string, number>()
  const motifSolves = new Map<string, number>()
  const phaseAttempts = new Map<string, number>()
  const structureLeaks = new Map<string, number>()

  for (const position of positions) {
    if (position.motif) motifLeaks.set(position.motif, (motifLeaks.get(position.motif) ?? 0) + 1)
    if (position.phase !== 'endgame') {
      const structure = matchPawnStructure(position.fen_before)
      if (structure) structureLeaks.set(structure, (structureLeaks.get(structure) ?? 0) + 1)
    }
  }
  for (const attempt of attempts) {
    const position = byId.get(attempt.position_id)
    if (!position) continue
    if (attempt.matched_best && position.motif) {
      motifSolves.set(position.motif, (motifSolves.get(position.motif) ?? 0) + 1)
    }
    if (position.phase) {
      phaseAttempts.set(position.phase, (phaseAttempts.get(position.phase) ?? 0) + 1)
    }
  }

  const structureGames = new Map<string, number>()
  for (const game of games) {
    const structure = structureFromOpening(game.opening_name, game.opening_eco)
    if (structure) structureGames.set(structure, (structureGames.get(structure) ?? 0) + 1)
  }

  const out = new Map<string, NodeExposure>()
  for (const node of nodes) {
    const tag = node.tag
    const next: NodeExposure = { games: 0, leaks: 0, solves: 0 }
    if (tag?.type === 'motif') {
      next.leaks = motifLeaks.get(tag.motif) ?? 0
      next.solves = motifSolves.get(tag.motif) ?? 0
    }
    if (tag?.type === 'opening') {
      next.games = games.filter((game) => matchesOpeningTag(game, tag)).length
    }
    if (tag?.type === 'structure') {
      const ids = structureIdsFor(tag.structure)
      next.games = ids.reduce((sum, id) => sum + (structureGames.get(id) ?? 0), 0)
      next.leaks = ids.reduce((sum, id) => sum + (structureLeaks.get(id) ?? 0), 0)
    }
    if (tag?.type === 'phase') next.solves = phaseAttempts.get(tag.phase) ?? 0
    out.set(node.id, next)
  }
  return out
}

export function nodeIsComplete(nodeId: string, marks: RoadmapMarks) {
  return marks.completed.includes(nodeId)
}

export function exposureLabel(stat: NodeExposure | undefined) {
  if (!stat) return null
  if (stat.games) return `${stat.games} game${stat.games === 1 ? '' : 's'} in library`
  if (stat.solves) return `${stat.solves} drill hit${stat.solves === 1 ? '' : 's'}`
  if (stat.leaks) return `${stat.leaks} leak${stat.leaks === 1 ? '' : 's'}`
  return null
}
