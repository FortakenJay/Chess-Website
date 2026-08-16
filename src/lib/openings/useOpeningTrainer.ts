import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  insertGenerationJob,
  loadProgress,
  loadTrainerData,
  saveOpening,
  updateGenerationJob,
  upsertProgress,
} from '@/lib/openings/persist'
import { isReasonTag, type ReasonTag } from '@/lib/openings/tags'
import type { BuiltNode, BuiltOpening, KnowledgeCard, NodeProgress, TrainedSide } from '@/lib/openings/types'
import { reasonChoices } from '@/lib/openings/distractors'
import { usePlayerData } from '@/lib/queries'
import type { Json, Tables } from '@/lib/supabase/database.types'
import { parseAlternatives, parseCommentary, parseExplorerStats, packKeyFor } from '@/lib/openings/commentary'
import { parseKnowledgeCard } from '@/lib/openings/parseCard'
import { COMMENTARY_GENERATOR_VERSION, type GenerationStage } from '@/lib/openings/types'
import {
  extendOpeningLine,
  fetchExplorerSlice,
  fetchOpeningPack,
  fetchStudyPgn,
  saveOpeningPack,
} from '@/lib/openings/functions'
import { openingFromDownloadHit, openingFromPgn } from '@/lib/openings/downloadLine'
import { openingHitKey, type OpeningSearchHit } from '@/lib/openings/searchCatalog'
import { formatMoveOrder, parseMoveOrderSans } from '@/lib/openings/tree'
import { MAX_TEACHING_PLY } from '@/lib/openings/lessonFromOpening'
import { isStructureId, structureFromOpening, type StructureId } from '@/lib/openings/structures'
import { normalizeUsername } from '@/lib/username'
import {
  initialGenerationState,
  processCourseChunk,
  shouldGenerateCourse,
  STAGE_LABEL,
} from '@/lib/openings/generateCourse'
import { ratingBandLabel } from '@/lib/openings/explorer'
import { evaluateLines } from '@/lib/analyzeClient'

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
    alternatives: parseAlternatives(row.alternatives),
    explorer_stats: parseExplorerStats(row.explorer_stats),
    frequency_weight: row.frequency_weight ?? 1,
    commentary: parseCommentary(row.commentary),
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
    generator_version: built.knowledge_card.generator_version ?? null,
    pack_key: null,
    generation_status: built.knowledge_card.low_confidence ? 'starter' : 'ready',
  }
}

export function useOpeningTrainer(username: string) {
  const { user, profile } = useAuth()
  const userId = user?.id ?? null
  const player = usePlayerData(username)
  const [nodes, setNodes] = useState<BuiltNode[]>([])
  const [items, setItems] = useState<DrillItem[]>([])
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<
    'loading' | 'select' | 'lesson' | 'recall' | 'reason' | 'done'
  >('loading')
  const [error, setError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null)
  const [score, setScore] = useState({ recall: 0, recallTotal: 0, reason: 0, reasonTotal: 0 })
  const [progressMap, setProgressMap] = useState<Map<string, NodeProgress>>(new Map())
  const [familyTags, setFamilyTags] = useState<ReasonTag[]>([])
  const [openings, setOpenings] = useState<Tables<'openings'>[]>([])
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null)
  const [selectedMode, setSelectedMode] = useState<TrainingMode>('weakest')
  const [lessonCard, setLessonCard] = useState<KnowledgeCard | null>(null)
  const [generation, setGeneration] = useState<{
    openingId: string
    jobId: string | null
    stage: GenerationStage
    done: number
    total: number
    paused: boolean
    error: string | null
  } | null>(null)
  const generationPause = useRef(false)
  const generationRun = useRef(0)

  const fetchSnapshot = useCallback(async (): Promise<Snapshot> => {
    const client = getBrowserClient()
    const data = await loadTrainerData(client, username)
    const nextNodes = data.nodes.map(asNode)
    const progressRows = userId
      ? await loadProgress(
          client,
          userId,
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
  }, [username, userId])

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

  function playerElo(): number {
    const ratings = (player.data?.games ?? [])
      .map((game) => game.user_rating)
      .filter((value): value is number => typeof value === 'number' && value > 0)
    if (!ratings.length) return 1700
    return ratings[0]!
  }

  function canPersist(): boolean {
    const linked = profile?.chess_com_username
    return Boolean(user && linked && normalizeUsername(linked) === normalizeUsername(username))
  }

  async function persistBuilt(built: BuiltOpening): Promise<string> {
    if (canPersist()) {
      const id = await saveOpening(getBrowserClient(), built, username)
      applySnapshot(await fetchSnapshot())
      return id
    }
    return attachLocalOpening(built)
  }

  async function runGeneration(openingId: string, built: BuiltOpening, jobId: string | null) {
    if (!shouldGenerateCourse(built.knowledge_card)) return
    const run = ++generationRun.current
    generationPause.current = false
    const elo = playerElo()
    const band = ratingBandLabel(elo)
    const key = packKeyFor(built.name, built.side, band, COMMENTARY_GENERATOR_VERSION)
    let state = initialGenerationState(built)
    setGeneration({
      openingId,
      jobId,
      stage: 'starter',
      done: 0,
      total: state.total,
      paused: false,
      error: null,
    })
    const deps = {
      fetchSlice: async (fen: string) =>
        (await fetchExplorerSlice({ data: { fen, elo } })) as Awaited<
          ReturnType<typeof fetchExplorerSlice>
        >,
      evaluate: async (fen: string) => {
        const lines = await evaluateLines(fen, 180, 2)
        const best = lines[0]?.pvSan[0] ?? null
        const reply = lines[0]?.pvSan[1] ?? null
        return { best, reply }
      },
    }
    while (state.stage !== 'ready' && run === generationRun.current) {
      if (generationPause.current) {
        setGeneration((current) => (current ? { ...current, paused: true, stage: 'paused' } : current))
        if (jobId && user) {
          await updateGenerationJob(getBrowserClient(), jobId, {
            stage: 'paused',
            paused: true,
            cursor: state.cursor,
            done_count: state.done,
            total_count: state.total,
          })
        }
        return
      }
      try {
        state = await processCourseChunk(built, state, deps)
        built = { ...built, nodes: state.nodes, knowledge_card: state.card }
        setNodes((current) => [
          ...current.filter((node) => node.opening_id !== openingId),
          ...state.nodes.map((node) => ({ ...node, opening_id: openingId })),
        ])
        setLessonCard(state.card)
        setGeneration({
          openingId,
          jobId,
          stage: state.stage,
          done: state.done,
          total: state.total,
          paused: false,
          error: null,
        })
        if (canPersist()) {
          await saveOpening(getBrowserClient(), { ...built, nodes: state.nodes }, username)
          if (jobId) {
            await updateGenerationJob(getBrowserClient(), jobId, {
              stage: state.stage,
              cursor: state.cursor,
              done_count: state.done,
              total_count: state.total,
              paused: false,
              error: null,
            })
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Course generation paused on an error'
        setGeneration({
          openingId,
          jobId,
          stage: 'error',
          done: state.done,
          total: state.total,
          paused: true,
          error: message,
        })
        if (jobId && user) {
          await updateGenerationJob(getBrowserClient(), jobId, {
            stage: 'error',
            error: message,
            paused: true,
            cursor: state.cursor,
            done_count: state.done,
          })
        }
        return
      }
    }
    if (state.stage === 'ready') {
      void saveOpeningPack({
        data: {
          packKey: key,
          openingName: built.name,
          side: built.side,
          ratingBand: band,
          generatorVersion: COMMENTARY_GENERATOR_VERSION,
          payload: { ...built, knowledge_card: state.card, nodes: state.nodes },
        },
      })
    }
  }

  async function downloadOpening(hit: OpeningSearchHit, side: TrainedSide) {
    setDownloadingKey(openingHitKey(hit))
    setDownloadError(null)
    try {
      if (!hit?.name || !hit.moves) throw new Error('That search result has no moves')
      const elo = playerElo()
      const band = ratingBandLabel(elo)
      const key = packKeyFor(hit.name, side, band, COMMENTARY_GENERATOR_VERSION)
      const cached = await fetchOpeningPack({ data: { packKey: key } })
      let built: BuiltOpening
      if (cached && typeof cached === 'object' && cached !== null && 'nodes' in (cached as object)) {
        built = cached as unknown as BuiltOpening
      } else {
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
        built = openingFromDownloadHit({
          name: hit.name,
          eco: hit.eco,
          moves,
          side,
        })
      }
      if (!built?.name) throw new Error('Could not build that opening')
      const id = await persistBuilt(built)
      startLesson(id, 'foundations', built.knowledge_card)
      if (shouldGenerateCourse(built.knowledge_card)) {
        let jobId: string | null = null
        if (canPersist() && user) {
          const job = await insertGenerationJob(getBrowserClient(), {
            user_id: user.id,
            username,
            pack_key: key,
            opening_id: id,
            opening_name: built.name,
            side,
            generator_version: COMMENTARY_GENERATOR_VERSION,
            rating_band: band,
            stage: 'starter',
            cursor: { stage: 'starter', nodeIndex: 0 },
            total_count: built.nodes.length,
          })
          jobId = job.id
        }
        void runGeneration(id, built, jobId)
      }
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Could not download that opening')
    } finally {
      setDownloadingKey(null)
    }
  }

  async function importOpeningPgn(pgn: string, side: TrainedSide) {
    setDownloadError(null)
    try {
      const built = openingFromPgn(pgn, side)
      const id = await persistBuilt(built)
      startLesson(id, 'foundations', built.knowledge_card)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Could not import that PGN')
    }
  }

  async function importLichessStudy(url: string, side: TrainedSide) {
    setDownloadError(null)
    try {
      const pgn = await fetchStudyPgn({ data: { studyId: url } })
      if (typeof pgn !== 'string') throw new Error('Could not fetch that study')
      await importOpeningPgn(pgn, side)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Could not import that study')
    }
  }

  function pauseGeneration() {
    generationPause.current = true
  }

  function resumeGeneration() {
    if (!generation || !selectedOpeningId) return
    const builtOpening = openings.find((row) => row.id === generation.openingId)
    const card = parseKnowledgeCard(builtOpening?.knowledge_card ?? null)
    if (!card) return
    const built: BuiltOpening = {
      name: builtOpening?.name ?? card.name,
      eco: builtOpening?.eco ?? null,
      side: (builtOpening?.side === 'b' ? 'b' : 'w') as TrainedSide,
      structure_family: builtOpening?.structure_family ?? null,
      center_type: (builtOpening?.center_type as BuiltOpening['center_type']) ?? null,
      theory_load: builtOpening?.theory_load ?? 2,
      knowledge_card: card,
      nodes: nodes.filter((node) => node.opening_id === generation.openingId),
      targets: {
        my_breaks: [],
        their_breaks: [],
        my_good_squares: [],
        their_good_squares: [],
        my_problem_piece: null,
        their_problem_piece: null,
        typical_endgame: null,
        tempo_traps: [],
      },
    }
    generationPause.current = false
    void runGeneration(generation.openingId, built, generation.jobId)
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
    downloading: Boolean(downloadingKey),
    downloadingKey,
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
    importOpeningPgn,
    importLichessStudy,
    generation: generation
      ? {
          ...generation,
          label: STAGE_LABEL[generation.paused ? 'paused' : generation.stage],
        }
      : null,
    pauseGeneration,
    resumeGeneration,
    chooseOpening,
    repeatSession,
    gradeRecall,
    gradeReason,
    advance,
  }
}
