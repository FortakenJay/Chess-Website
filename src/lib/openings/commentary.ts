import type { Json } from '@/lib/supabase/database.types'
import { isReasonTag } from './tags'
import type {
  ExplorerReply,
  ModelGameRef,
  MoveCommentary,
  NodeAlternative,
} from './types'

export function parseAlternatives(value: Json | null | undefined): NodeAlternative[] {
  if (!Array.isArray(value)) return []
  const rows: NodeAlternative[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const san = typeof row.san === 'string' ? row.san : ''
    const tag = typeof row.tag === 'string' && isReasonTag(row.tag) ? row.tag : null
    const why = typeof row.why_worse === 'string' ? row.why_worse : ''
    if (san && tag) rows.push({ san, tag, why_worse: why || 'Weaker than the repertoire move.' })
  }
  return rows
}

export function parseExplorerStats(value: Json | null | undefined): ExplorerReply[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const rows: ExplorerReply[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.san !== 'string') continue
    rows.push({
      rating_band: typeof row.rating_band === 'string' ? row.rating_band : '',
      san: row.san,
      plays: typeof row.plays === 'number' ? row.plays : 0,
      pct: typeof row.pct === 'number' ? row.pct : 0,
      win_pct: typeof row.win_pct === 'number' ? row.win_pct : null,
      corpus: row.corpus === 'masters' ? 'masters' : row.corpus === 'club' ? 'club' : undefined,
      games: parseModelGames(row.games),
    })
  }
  return rows.length ? rows : null
}

function parseModelGames(value: unknown): ModelGameRef[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  const rows: ModelGameRef[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string') continue
    rows.push({
      id: row.id,
      white: typeof row.white === 'string' ? row.white : 'White',
      black: typeof row.black === 'string' ? row.black : 'Black',
      year: typeof row.year === 'number' ? row.year : undefined,
      winner:
        row.winner === 'white' || row.winner === 'black' || row.winner === 'draw' ? row.winner : null,
    })
  }
  return rows.length ? rows : undefined
}

export function parseCommentary(value: Json | null | undefined): MoveCommentary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const evidence = row.evidence
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return null
  const ev = evidence as Record<string, unknown>
  if (typeof ev.fen !== 'string' || typeof ev.fen_before !== 'string' || typeof ev.san !== 'string') {
    return null
  }
  if (typeof row.why !== 'string' || !row.why.trim()) return null
  const confidence =
    row.confidence === 'verified' ||
    row.confidence === 'evidence' ||
    row.confidence === 'imported' ||
    row.confidence === 'basic'
      ? row.confidence
      : 'basic'
  const provenance =
    row.provenance === 'authored' ||
    row.provenance === 'board' ||
    row.provenance === 'imported' ||
    row.provenance === 'template' ||
    row.provenance === 'engine'
      ? row.provenance
      : 'template'
  return {
    problem: typeof row.problem === 'string' ? row.problem : undefined,
    accomplishes: typeof row.accomplishes === 'string' ? row.accomplishes : undefined,
    attacks: stringList(row.attacks),
    defends: stringList(row.defends),
    controls: stringList(row.controls),
    enables: typeof row.enables === 'string' ? row.enables : undefined,
    drawback: typeof row.drawback === 'string' ? row.drawback : undefined,
    if_omitted: typeof row.if_omitted === 'string' ? row.if_omitted : undefined,
    position_type: typeof row.position_type === 'string' ? row.position_type : undefined,
    plans: stringList(row.plans),
    why: row.why,
    confidence,
    provenance,
    generator_version: typeof row.generator_version === 'number' ? row.generator_version : 1,
    evidence: {
      fen: ev.fen,
      fen_before: ev.fen_before,
      san: ev.san,
      ply: typeof ev.ply === 'number' ? ev.ply : 0,
      attacks: stringList(ev.attacks) ?? [],
      defends: stringList(ev.defends) ?? [],
      controls: stringList(ev.controls) ?? [],
      opened: stringList(ev.opened) ?? [],
      blocked_breaks: stringList(ev.blocked_breaks) ?? [],
      legal_breaks: stringList(ev.legal_breaks) ?? [],
      explorer: undefined,
      model_games: parseModelGames(ev.model_games),
      engine_best_san: typeof ev.engine_best_san === 'string' ? ev.engine_best_san : null,
      engine_reply_san: typeof ev.engine_reply_san === 'string' ? ev.engine_reply_san : null,
    },
  }
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const rows = value.filter((item): item is string => typeof item === 'string')
  return rows.length ? rows : undefined
}

export function packKeyFor(name: string, side: string, ratingBand: string, version: number): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug}|${side}|${ratingBand}|${version}`
}
