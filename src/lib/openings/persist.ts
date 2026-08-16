import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json, Tables } from '@/lib/supabase/database.types'
import { packKeyFor } from './commentary'
import type {
  BuiltOpening,
  BuiltNode,
  GenerationCursor,
  GenerationStage,
  NodeProgress,
} from './types'

type Client = SupabaseClient<Database>

function openingMeta(opening: BuiltOpening) {
  const version = opening.knowledge_card.generator_version ?? null
  return {
    eco: opening.eco,
    structure_family: opening.structure_family,
    center_type: opening.center_type,
    theory_load: opening.theory_load,
    knowledge_card: opening.knowledge_card as unknown as Json,
    generator_version: version,
    pack_key: version ? packKeyFor(opening.name, opening.side, '1600-1800', version) : null,
    generation_status: opening.knowledge_card.provenance === 'authored'
      ? 'ready'
      : opening.knowledge_card.low_confidence
        ? opening.knowledge_card.generator_version
          ? 'generating'
          : 'starter'
        : opening.knowledge_card.generator_version
          ? 'ready'
          : null,
  }
}

function nodeInsert(openingId: string, node: BuiltNode, parentDbId: string | null) {
  return {
    opening_id: openingId,
    parent_node_id: parentDbId,
    fen: node.fen,
    ply: node.ply,
    san: node.san,
    is_mine: node.is_mine,
    source: node.source,
    reason_tags: node.reason_tags,
    reason_text: node.reason_text,
    alternatives: node.alternatives as unknown as Json,
    explorer_stats: (node.explorer_stats ?? null) as unknown as Json,
    frequency_weight: node.frequency_weight,
    commentary: (node.commentary ?? null) as unknown as Json,
  }
}

export async function saveOpening(
  client: Client,
  opening: BuiltOpening,
  username: string | null,
): Promise<string> {
  if (!opening?.name || !opening.nodes?.length) {
    throw new Error('Could not save that opening — the download came back empty.')
  }
  let existingId: string | null = null
  let query = client.from('openings').select('id').eq('name', opening.name).eq('side', opening.side)
  query = username == null ? query.is('username', null) : query.eq('username', username)
  const { data: existing, error: findError } = await query.maybeSingle()
  if (findError) throw findError
  existingId = existing?.id ?? null

  if (existingId) {
    const { error } = await client.from('opening_nodes').delete().eq('opening_id', existingId)
    if (error) throw error
    const { error: updateError } = await client
      .from('openings')
      .update(openingMeta(opening))
      .eq('id', existingId)
    if (updateError) throw updateError
  } else {
    const { data, error } = await client
      .from('openings')
      .insert({
        username,
        name: opening.name,
        side: opening.side,
        ...openingMeta(opening),
      })
      .select('id')
      .single()
    if (error) throw error
    existingId = data.id
  }

  const id = existingId
  const idMap = new Map<string, string>()
  for (const node of opening.nodes) {
    const { data, error } = await client
      .from('opening_nodes')
      .insert(
        nodeInsert(id, node, node.parent_node_id ? (idMap.get(node.parent_node_id) ?? null) : null),
      )
      .select('id')
      .single()
    if (error) throw error
    idMap.set(node.id, data.id)
  }

  const { error: targetError } = await client.from('structure_targets').upsert({
    opening_id: id,
    ...opening.targets,
  })
  if (targetError) throw targetError
  return id
}

export async function updateOpeningProgress(
  client: Client,
  openingId: string,
  opening: BuiltOpening,
  nodes: BuiltNode[],
) {
  const { error: updateError } = await client
    .from('openings')
    .update(openingMeta(opening))
    .eq('id', openingId)
  if (updateError) throw updateError

  for (const node of nodes) {
    if (!node.id) continue
    const { error } = await client
      .from('opening_nodes')
      .update({
        reason_tags: node.reason_tags,
        reason_text: node.reason_text,
        alternatives: node.alternatives as unknown as Json,
        explorer_stats: (node.explorer_stats ?? null) as unknown as Json,
        commentary: (node.commentary ?? null) as unknown as Json,
        frequency_weight: node.frequency_weight,
      })
      .eq('id', node.id)
    if (error) throw error
  }
}

export async function loadTrainerData(client: Client, username: string) {
  const shared = await client.from('openings').select('*').is('username', null)
  if (shared.error) throw shared.error
  const personal = await client.from('openings').select('*').eq('username', username)
  if (personal.error) throw personal.error
  const openings = [...(shared.data ?? []), ...(personal.data ?? [])]
  const ids = openings.map((row) => row.id)
  if (ids.length === 0) {
    return { openings: [], nodes: [], targets: [] }
  }
  const { data: nodes, error: nodeError } = await client
    .from('opening_nodes')
    .select('*')
    .in('opening_id', ids)
    .order('ply')
  if (nodeError) throw nodeError
  const { data: targets, error: targetError } = await client
    .from('structure_targets')
    .select('*')
    .in('opening_id', ids)
  if (targetError) throw targetError
  return { openings, nodes: nodes ?? [], targets: targets ?? [] }
}

export async function loadProgress(client: Client, userId: string, nodeIds: string[]) {
  if (nodeIds.length === 0) return []
  const { data, error } = await client
    .from('node_progress')
    .select('*')
    .eq('user_id', userId)
    .in('node_id', nodeIds)
  if (error) throw error
  return data ?? []
}

export async function upsertProgress(client: Client, userId: string, progress: NodeProgress) {
  const { error } = await client.from('node_progress').upsert({
    user_id: userId,
    node_id: progress.node_id,
    recall_ease: progress.recall_ease,
    understanding_ease: progress.understanding_ease,
    due_at: progress.due_at,
    last_recall_pass: progress.last_recall_pass,
    last_understanding_pass: progress.last_understanding_pass,
    streak: progress.streak,
    lapses: progress.lapses,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function insertExplorerNodes(
  client: Client,
  openingId: string,
  parentDbId: string,
  nodes: BuiltNode[],
) {
  const inserted: BuiltNode[] = []
  for (const node of nodes) {
    const { data, error } = await client
      .from('opening_nodes')
      .insert(nodeInsert(openingId, { ...node, source: 'explorer' }, parentDbId))
      .select('id')
      .single()
    if (error && error.code !== '23505') throw error
    if (data) inserted.push({ ...node, id: data.id, opening_id: openingId })
  }
  return inserted
}

export type GenerationJobRow = Tables<'opening_generation_jobs'>

export async function insertGenerationJob(
  client: Client,
  row: {
    user_id: string
    username: string
    pack_key: string
    opening_id: string
    opening_name: string
    side: string
    generator_version: number
    rating_band: string
    stage: GenerationStage
    cursor: GenerationCursor
    total_count: number
  },
): Promise<GenerationJobRow> {
  const { data, error } = await client
    .from('opening_generation_jobs')
    .insert({
      user_id: row.user_id,
      username: row.username,
      pack_key: row.pack_key,
      opening_id: row.opening_id,
      opening_name: row.opening_name,
      side: row.side,
      generator_version: row.generator_version,
      rating_band: row.rating_band,
      stage: row.stage,
      cursor: row.cursor as unknown as Json,
      done_count: 0,
      total_count: row.total_count,
      paused: false,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateGenerationJob(
  client: Client,
  id: string,
  patch: Partial<{
    stage: GenerationStage
    cursor: GenerationCursor
    done_count: number
    total_count: number
    error: string | null
    paused: boolean
  }>,
) {
  const { error } = await client
    .from('opening_generation_jobs')
    .update({
      ...patch,
      cursor: patch.cursor ? (patch.cursor as unknown as Json) : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function loadOpenGenerationJob(client: Client, userId: string, openingId?: string) {
  let query = client
    .from('opening_generation_jobs')
    .select('*')
    .eq('user_id', userId)
    .neq('stage', 'ready')
    .order('updated_at', { ascending: false })
    .limit(1)
  if (openingId) query = query.eq('opening_id', openingId)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}
