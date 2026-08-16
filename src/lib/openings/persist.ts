import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
import type { BuiltOpening, BuiltNode, NodeProgress } from './types'

type Client = SupabaseClient<Database>

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
      .update({
        eco: opening.eco,
        structure_family: opening.structure_family,
        center_type: opening.center_type,
        theory_load: opening.theory_load,
        knowledge_card: opening.knowledge_card as unknown as Json,
      })
      .eq('id', existingId)
    if (updateError) throw updateError
  } else {
    const { data, error } = await client
      .from('openings')
      .insert({
        username,
        name: opening.name,
        eco: opening.eco,
        side: opening.side,
        structure_family: opening.structure_family,
        center_type: opening.center_type,
        theory_load: opening.theory_load,
        knowledge_card: opening.knowledge_card as unknown as Json,
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
      .insert({
        opening_id: id,
        parent_node_id: node.parent_node_id ? (idMap.get(node.parent_node_id) ?? null) : null,
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
      })
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
  for (const node of nodes) {
    const { error } = await client.from('opening_nodes').insert({
      opening_id: openingId,
      parent_node_id: parentDbId,
      fen: node.fen,
      ply: node.ply,
      san: node.san,
      is_mine: node.is_mine,
      source: 'explorer',
      reason_tags: [],
      reason_text: null,
      alternatives: [],
      explorer_stats: (node.explorer_stats ?? null) as unknown as Json,
      frequency_weight: node.frequency_weight,
    })
    if (error && error.code !== '23505') throw error
  }
}
