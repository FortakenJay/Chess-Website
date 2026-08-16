import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { getBrowserClient } from '@/lib/supabase/browser'
import { applyReview, emptyProgress } from '@/lib/openings/schedule'
import {
  buildSession,
  openingTrainingStats,
  trainableNodes,
  type DrillItem,
  type OpeningTrainingStats,
  type TrainingMode,
} from '@/lib/openings/session'
import { openingPlayedCount } from '@/lib/openings/matchPlayed'
import { loadProgress, loadTrainerData, saveOpening, upsertProgress } from '@/lib/openings/persist'
import { isReasonTag, type ReasonTag } from '@/lib/openings/tags'
import type { BuiltNode, BuiltOpening, KnowledgeCard, NodeProgress, TrainedSide } from '@/lib/openings/types'
import { reasonChoices } from '@/lib/openings/distractors'
import { usePlayerData } from '@/lib/queries'
import type { Json, Tables } from '@/lib/supabase/database.types'
import { parseKnowledgeCard } from '@/lib/openings/parseCard'
import { extendOpeningLine } from '@/lib/openings/functions'
import { openingFromDownloadHit } from '@/lib/openings/downloadLine'
import type { OpeningSearchHit } from '@/lib/openings/searchCatalog'
import { formatMoveOrder, parseMoveOrderSans } from '@/lib/openings/tree'
import { MAX_TEACHING_PLY } from '@/lib/openings/lessonFromOpening'
import { isStructureId, structureFromOpening, type StructureId } from '@/lib/openings/structures'
import { normalizeUsername } from '@/lib/username'

function asNode(row: Tables<'opening_nodes'>): BuiltNode {
  return {
    id: row.id,
    opening_id: row.opening_id,
    parent_node_id: row.parent_node_id,
    fen: row.fen,
    ply: row.ply,
    san: row.san,
    is_mine: row.is_mine,
    source: row.source === 'explorer' ? 'explorer' : 'repertoire',
    reason_tags: (row.reason_tags ?? []).filter(isReasonTag),
    reason_text: row.reason_text,
    alternatives: [],
    explorer_stats: null,
    frequency_weight: row.frequency_weight ?? 1,
  }
}

export type OpeningTrainingOption = {
  id: string
  name: string
  eco: string | null
  side: string
  structureFamily: string | null
  centerType: string | null
  theoryLoad: number
  gamesPlayed: number
  known: boolean
  stats: OpeningTrainingStats
}

type Snapshot = {
  nodes: BuiltNode[]
  openings: Tables<'openings'>[]
  progressMap: Map<string, NodeProgress>
  familyTags: ReasonTag[]
}

function localOpeningRow(
  id: string,
  username: string,
  built: BuiltOpening,
): Tables<'openings'> {
  return {
    id,
    username,
    name: built.name,
    eco: built.eco,
    side: built.side,
    structure_family: built.structure_family,
    center_type: built.center_type,
    theory_load: built.theory_load,
    knowledge_card: built.knowledge_card as unknown as Json,
    parent_id: null,
    created_at: new Date().toISOString(),
  }
}

export function useOpeningTrainer(username: string) {
  const { user, profile } = useAuth()
  const player = usePlayerData(username)
  const [nodes, setNodes] = useState<BuiltNode[]>([])
  const [items, setItems] = useState<DrillItem[]>([])
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<
    'loading' | 'select' | 'lesson' | 'recall' | 'reason' | 'done'
  >('loading')
  const [error, setError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [score, setScore] = useState({ recall: 0, recallTotal: 0, reason: 0, reasonTotal: 0 })
  const [progressMap, setProgressMap] = useState<Map<string, NodeProgress>>(new Map())
  const [familyTags, setFamilyTags] = useState<ReasonTag[]>([])
  const [openings, setOpenings] = useState<Tables<'openings'>[]>([])
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null)
  const [selectedMode, setSelectedMode] = useState<TrainingMode>('weakest')
  const [lessonCard, setLessonCard] = useState<KnowledgeCard | null>(null)

  const fetchSnapshot = useCallback(async (): Promise<Snapshot> => {
    const client = getBrowserClient()
    const data = await loadTrainerData(client, username)
    const nextNodes = data.nodes.map(asNode)
    const progressRows = user
      ? await loadProgress(
          client,
          user.id,
          nextNodes.map((node) => node.id),
        )
      : []
    const map = new Map<string, NodeProgress>()
    for (const row of progressRows) {
      map.set(row.node_id, {
        node_id: row.node_id,
        recall_ease: row.recall_ease,
        understanding_ease: row.understanding_ease,
        due_at: row.due_at,
        last_recall_pass: row.last_recall_pass,
        last_understanding_pass: row.last_understanding_pass,
        streak: row.streak,
        lapses: row.lapses,
      })
    }
    return {
      nodes: nextNodes,
      openings: data.openings,
      progressMap: map,
      familyTags: nextNodes.flatMap((node) => node.reason_tags),
    }
  }, [username, user])

  const applySnapshot = useCallback((snapshot: Snapshot) => {
    setNodes(snapshot.nodes)
    setOpenings(snapshot.openings)
    setProgressMap(snapshot.progressMap)
    setFamilyTags(snapshot.familyTags)
  }, [])

  const load = useCallback(async () => {
    setError(null)
    setPhase('loading')
    try {
      applySnapshot(await fetchSnapshot())
      setItems([])
      setIndex(0)
      setSelectedOpeningId(null)
      setLessonCard(null)
      setScore({ recall: 0, recallTotal: 0, reason: 0, reasonTotal: 0 })
      setPhase('select')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load openings')
      setPhase('done')
    }
  }, [applySnapshot, fetchSnapshot])

  useEffect(() => {
    void load()
  }, [load])

  const item = items[index] ?? null
  const games = player.data?.games ?? []
  const openingOptions = useMemo<OpeningTrainingOption[]>(
    () =>
      openings
        .map((opening) => {
          const stats = openingTrainingStats(nodes, progressMap, opening.id)
          const gamesPlayed = openingPlayedCount(opening, games)
          return {
            id: opening.id,
            name: opening.name,
            eco: opening.eco,
            side: opening.side,
            structureFamily: opening.structure_family,
            centerType: opening.center_type,
            theoryLoad: opening.theory_load,
            gamesPlayed,
            known: gamesPlayed > 0 || stats.attempted > 0,
            stats,
          }
        })
        .filter((opening) => opening.stats.total > 0)
        .sort((a, b) => {
          if (a.known !== b.known) return a.known ? -1 : 1
          if (a.known && b.known) {
            const aStarted = a.stats.attempted > 0
            const bStarted = b.stats.attempted > 0
            if (aStarted !== bStarted) return aStarted ? -1 : 1
            const weakness = a.stats.weakestEase - b.stats.weakestEase
            if (weakness !== 0) return weakness
            if (a.stats.lapses !== b.stats.lapses) return b.stats.lapses - a.stats.lapses
          }
          return a.name.localeCompare(b.name)
        }),
    [games, nodes, openings, progressMap],
  )
  const knownOpenings = useMemo(
    () => openingOptions.filter((opening) => opening.known),
    [openingOptions],
  )
  const newOpenings = useMemo(
    () => openingOptions.filter((opening) => !opening.known),
    [openingOptions],
  )
  const selectedOpening = openings.find((row) => row.id === selectedOpeningId) ?? null
  const knowledgeCard =
    lessonCard ?? parseKnowledgeCard(selectedOpening?.knowledge_card ?? null)
  const openingName = selectedOpening?.name ?? 'Opening'
  const structureLabId: StructureId | null = selectedOpening
    ? (structureFromOpening(selectedOpening.name, selectedOpening.eco) ??
      (selectedOpening.structure_family && isStructureId(selectedOpening.structure_family)
        ? selectedOpening.structure_family
        : null))
    : null
  const trueTag = item?.node.reason_tags[0]
  const choices = useMemo(() => {
    if (!item || !trueTag) return []
    return reasonChoices(trueTag, familyTags, item.node.id)
  }, [familyTags, item, trueTag])

  async function save(nodeId: string, next: NodeProgress) {
    if (!user) return
    await upsertProgress(getBrowserClient(), user.id, next)
    setProgressMap((current) => new Map(current).set(nodeId, next))
  }

  function cardForOpening(openingId: string): KnowledgeCard | null {
    const row = openings.find((opening) => opening.id === openingId)
    return parseKnowledgeCard(row?.knowledge_card ?? null)
  }

  function startSession(openingId: string, mode: Exclude<TrainingMode, 'scheduled'>) {
    const session = buildSession(nodes, progressMap, { openingId, mode })
    setSelectedOpeningId(openingId)
    setSelectedMode(mode)
    setItems(session)
    setIndex(0)
    setScore({ recall: 0, recallTotal: 0, reason: 0, reasonTotal: 0 })
    setPhase(session.length ? 'recall' : 'done')
  }

  function startLesson(
    openingId: string,
    mode: Exclude<TrainingMode, 'scheduled'>,
    card?: KnowledgeCard | null,
  ) {
    const resolved = card ?? cardForOpening(openingId)
    setSelectedOpeningId(openingId)
    setSelectedMode(mode)
    if (resolved) {
      setLessonCard(resolved)
      setItems([])
      setIndex(0)
      setScore({ recall: 0, recallTotal: 0, reason: 0, reasonTotal: 0 })
      setPhase('lesson')
      return
    }
    startSession(openingId, mode)
  }

  function beginDrill() {
    if (!selectedOpeningId || selectedMode === 'scheduled') return
    startSession(selectedOpeningId, selectedMode)
  }

  function reviewLesson() {
    if (!selectedOpeningId) return
    const card = cardForOpening(selectedOpeningId)
    if (!card) return
    setLessonCard(card)
    setPhase('lesson')
  }

  function chooseOpening() {
    setItems([])
    setIndex(0)
    setSelectedOpeningId(null)
    setLessonCard(null)
    setPhase('select')
  }

  function repeatSession() {
    if (!selectedOpeningId || selectedMode === 'scheduled') return
    startSession(selectedOpeningId, selectedMode)
  }

  function attachLocalOpening(built: BuiltOpening): string {
    const existing = openings.find(
      (row) => row.name === built.name && row.side === built.side && row.username === username,
    )
    const id = existing?.id ?? crypto.randomUUID()
    const row = localOpeningRow(id, username, built)
    setOpenings((current) => [...current.filter((item) => item.id !== id), row])
    setNodes((current) => [
      ...current.filter((node) => node.opening_id !== id),
      ...built.nodes.map((node) => ({ ...node, opening_id: id })),
    ])
    setFamilyTags((current) => [...current, ...built.nodes.flatMap((node) => node.reason_tags)])
    return id
  }

  async function downloadOpening(hit: OpeningSearchHit, side: TrainedSide) {
    setDownloading(true)
    setDownloadError(null)
    try {
      if (!hit?.name || !hit.moves) throw new Error('That search result has no moves')
      let moves = hit.moves
      const sans = parseMoveOrderSans(moves)
      if (sans.length < 10) {
        try {
          const extended = await extendOpeningLine({ data: { moves } })
          if (Array.isArray(extended) && extended.length) {
            moves = formatMoveOrder(extended.slice(0, MAX_TEACHING_PLY))
          }
        } catch {
          // Keep the named ECO line if explorer is down.
        }
      }
      const built = openingFromDownloadHit({
        name: hit.name,
        eco: hit.eco,
        moves,
        side,
      })
      if (!built?.name) throw new Error('Could not build that opening')
      const linked = profile?.chess_com_username
      const canSave = Boolean(
        user && linked && normalizeUsername(linked) === normalizeUsername(username),
      )
      let id: string
      if (canSave) {
        id = await saveOpening(getBrowserClient(), built, username)
        applySnapshot(await fetchSnapshot())
      } else {
        id = attachLocalOpening(built)
      }
      startLesson(id, 'foundations', built.knowledge_card)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Could not download that opening')
    } finally {
      setDownloading(false)
    }
  }

  function advance() {
    if (index + 1 >= items.length) {
      setPhase('done')
      return
    }
    setIndex((i) => i + 1)
    setPhase('recall')
  }

  async function gradeRecall(pass: boolean) {
    if (!item) return
    const current = progressMap.get(item.node.id) ?? emptyProgress(item.node.id)
    await save(item.node.id, applyReview(current, { recall: pass }))
    setScore((s) => ({ ...s, recall: s.recall + (pass ? 1 : 0), recallTotal: s.recallTotal + 1 }))
    if (item.includeReason && trueTag) setPhase('reason')
  }

  async function gradeReason(pass: boolean) {
    if (!item) return
    const current = progressMap.get(item.node.id) ?? emptyProgress(item.node.id)
    await save(item.node.id, applyReview(current, { understanding: pass }))
    setScore((s) => ({ ...s, reason: s.reason + (pass ? 1 : 0), reasonTotal: s.reasonTotal + 1 }))
  }

  return {
    phase,
    error,
    downloadError,
    downloading,
    item,
    openingName,
    knowledgeCard,
    structureLabId,
    openingOptions,
    knownOpenings,
    newOpenings,
    selectedOpeningId,
    trueTag,
    choices,
    score,
    index,
    total: items.length,
    reload: load,
    startSession,
    startLesson,
    beginDrill,
    reviewLesson,
    downloadOpening,
    chooseOpening,
    repeatSession,
    gradeRecall,
    gradeReason,
    advance,
  }
}
