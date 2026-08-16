import { Chess, type Square } from 'chess.js'
import {
  accuracyFromAcpl,
  averageAccuracy,
  moveAccuracy,
  softCentipawnLoss,
} from './classify'
import { clockBucket, parseClk } from './clock'
import { endgameTypeOf, materialImbalance } from './endgame'
import {
  applyMoveOverrides,
  classifyExpectedPoints,
  cpForMover,
  evaluateBrilliantGates,
  expectedPoints,
  expectedPointsLost,
  isGreatMove,
  isMiss,
  leakClassification,
} from './moveClassifier'
import { detectMotif } from './motifs'
import { isBookMove } from './openingBook'
import { phaseOf } from './phase'
import {
  applyEndgameResult,
  classifyEndgameEntry,
  classifyPositionStructure,
  classifyStrategyThemes,
  recordEndgameAccuracy,
  recordStrategyMove,
} from './strategy'
import {
  ANALYSIS_VERSION,
  emptyClockStats,
  emptyEndgameAccuracyStats,
  emptyEndgameConversion,
  emptyEndgameStats,
  emptyPhaseAcpl,
  emptyPhaseStats,
  emptyQualityStats,
  emptyStrategyStats,
  isOmissionMotif,
  type AnalyzedPly,
  type AnalysisBudget,
  type EngineEval,
  type EngineLine,
  type EndgameEntry,
  type GameAnalysis,
  type MoveQuality,
  type Side,
} from './types'

export type RawGame = {
  pgn: string
  url: string
  endTime: number
  white?: string
  black?: string
  whiteResult?: string
  blackResult?: string
  whiteRating?: number
  blackRating?: number
  timeClass?: string
}

function outcomeFor(
  userIsWhite: boolean,
  result: string,
  whiteResult?: string,
  blackResult?: string,
): 'win' | 'loss' | 'draw' {
  const mine = userIsWhite ? whiteResult : blackResult
  if (mine === 'win') return 'win'
  const draws = new Set([
    'stalemate',
    'agreed',
    'repetition',
    'insufficient',
    '50move',
    'timevsinsufficient',
    'draw',
  ])
  if (mine && draws.has(mine)) return 'draw'
  if (result === '1/2-1/2') return 'draw'
  if (result === '1-0') return userIsWhite ? 'win' : 'loss'
  if (result === '0-1') return userIsWhite ? 'loss' : 'win'
  return 'loss'
}

function playedOn(headers: Record<string, string>, endTime: number): string {
  // Prefer finish time — daily games keep the start date in [Date] / [UTCDate].
  if (endTime > 0) return new Date(endTime * 1000).toISOString().slice(0, 10)
  const raw = headers.UTCDate || headers.Date || ''
  const iso = raw.replace(/\./g, '-')
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  return new Date().toISOString().slice(0, 10)
}

function playedBestMove(bestUci: string, move: { from: string; to: string; promotion?: string | undefined }) {
  const played = `${move.from}${move.to}${move.promotion ?? ''}`
  const best = bestUci.length === 4 ? bestUci : bestUci
  const playedNorm = move.promotion ? played : `${move.from}${move.to}`
  return best === played || best === playedNorm || best.startsWith(`${move.from}${move.to}`)
}

function uciToSan(fen: string, uci: string): string | null {
  if (!uci || uci === '0000' || uci.length < 4) return null
  try {
    const board = new Chess(fen)
    const played = board.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: (uci[4] as 'q' | 'r' | 'b' | 'n' | undefined) ?? undefined,
    })
    return played?.san ?? null
  } catch {
    return null
  }
}

function cleanOpening(name: string | null): string | null {
  if (!name) return null
  try {
    const url = new URL(name)
    const slug = url.pathname.split('/').filter(Boolean).at(-1)
    if (!slug) return name
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  } catch {
    return name
  }
}

export async function analyzeGame(
  game: RawGame,
  username: string,
  evaluate: (fen: string) => Promise<EngineEval>,
  options?: {
    signal?: AbortSignal
    onPly?: (info: { ply: number; plyTotal: number }) => void
    onFlagged?: (position: GameAnalysis['flagged'][number]) => void
    /** Collect full move tape + eval curve for Chess.com-style review. */
    includePlies?: boolean
    /** Fixed-budget MultiPV pass. Must return at least four candidates. */
    evaluateLines?: (fen: string) => Promise<EngineLine[]>
    analysisBudget?: AnalysisBudget
  },
): Promise<GameAnalysis | null> {
  const chess = new Chess()
  try {
    chess.loadPgn(game.pgn)
  } catch {
    return null
  }

  const headers = chess.getHeaders()
  const white = (game.white || headers.White || '').toLowerCase()
  const black = (game.black || headers.Black || '').toLowerCase()
  const user = username.toLowerCase()
  if (white !== user && black !== user) return null

  const userIsWhite = white === user
  const color: Side = userIsWhite ? 'white' : 'black'
  const opponent = userIsWhite ? headers.Black || 'unknown' : headers.White || 'unknown'
  const date = playedOn(headers, game.endTime)
  const comments = new Map(chess.getComments().map((c) => [c.fen, c.comment]))
  const history = chess.history({ verbose: true })
  const timeClass = game.timeClass ?? headers.TimeControl ?? null
  const userRating = userIsWhite ? (game.whiteRating ?? null) : (game.blackRating ?? null)
  const opponentRating = userIsWhite ? (game.blackRating ?? null) : (game.whiteRating ?? null)
  const openingEco = headers.ECO || null
  const openingName = cleanOpening(headers.Opening || headers.ECOUrl || null)

  const phaseStats = emptyPhaseStats()
  const clockStats = emptyClockStats()
  const qualityStats = emptyQualityStats()
  const endgameStats = emptyEndgameStats()
  const endgameAccuracyStats = emptyEndgameAccuracyStats()
  const strategyStats = emptyStrategyStats()
  const endgameConversion = emptyEndgameConversion()
  const phaseAcpl = emptyPhaseAcpl()
  const opponentQualityStats = emptyQualityStats()
  const opponentPhaseStats = emptyPhaseStats()
  const opponentPhaseAcpl = emptyPhaseAcpl()
  const flagged: GameAnalysis['flagged'] = []
  const plies: AnalyzedPly[] = []
  const evalCurve: number[] = []
  let blunderCount = 0
  let mistakeCount = 0
  let inaccuracyCount = 0
  let totalMoves = 0
  let totalLoss = 0
  let opponentTotalMoves = 0
  let opponentTotalLoss = 0
  const userMoveAccuracies: number[] = []
  const opponentMoveAccuracies: number[] = []
  const userEpLosses: number[] = []
  const opponentEpLosses: number[] = []
  const userMoveQualities: MoveQuality[] = []
  let seenEndgame = false
  let endgameUp = false
  let endgameOpportunities = 0
  let endgameEntry: EndgameEntry | null = null
  let endgameEntryEp = 0

  const includePlies = Boolean(options?.includePlies)
  const replay = new Chess()
  let previousEpLost: number | null = null

  function evalFromLine(line: EngineLine, fen: string): EngineEval {
    const stmWhite = fen.split(' ')[1] !== 'b'
    const mateForStm =
      line.mate == null ? null : stmWhite ? line.mate : -line.mate
    return {
      cp: line.cp,
      mate: line.mate,
      mateForStm,
      bestMove: line.bestMove,
    }
  }

  async function evaluatePosition(fen: string): Promise<{
    eval: EngineEval
    lines: EngineLine[]
  }> {
    if (options?.evaluateLines) {
      const lines = await options.evaluateLines(fen)
      const first = lines[0]
      if (first) return { eval: evalFromLine(first, fen), lines }
    }
    const result = await evaluate(fen)
    return {
      eval: result,
      lines: [
        {
          multipv: 1,
          cp: result.cp,
          mate: result.mate,
          bestMove: result.bestMove,
          pvUci: result.bestMove ? [result.bestMove] : [],
          pvSan: [],
        },
      ],
    }
  }

  let beforePosition = await evaluatePosition(replay.fen())
  if (includePlies) evalCurve.push(beforePosition.eval.cp)

  for (let i = 0; i < history.length; i++) {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const move = history[i]!
    const fenBefore = move.before
    const mover: Side = move.color === 'w' ? 'white' : 'black'
    const isUserMove = mover === color

    const evalBefore = beforePosition.eval
    const candidateLines = beforePosition.lines
    replay.move(move)
    const deliversMate = replay.isCheckmate()
    const afterPosition = deliversMate
      ? {
          lines: [] as EngineLine[],
          eval: {
          cp: mover === 'white' ? 100_000 : -100_000,
          mate: mover === 'white' ? 1 : -1,
          mateForStm: null as number | null,
          bestMove: '',
          },
        }
      : await evaluatePosition(replay.fen())
    const evalAfter = afterPosition.eval

    if (includePlies) evalCurve.push(evalAfter.cp)

    const epBefore = expectedPoints(evalBefore, mover)
    const epAfter = expectedPoints(evalAfter, mover)
    const epLost = expectedPointsLost(evalBefore, evalAfter, mover)
    const baseQuality = classifyExpectedPoints(epLost)
    const classification = leakClassification(baseQuality)
    const moveNumber = Number(fenBefore.split(' ')[5] ?? 1)

    // Keep CPL aggregates for existing ACPL charts; tiers now use expected points.
    const rawLoss = deliversMate ? 0 : softCentipawnLoss(evalBefore, evalAfter, mover)
    const best =
      deliversMate || playedBestMove(evalBefore.bestMove, move) || rawLoss === 0
    const loss = best ? 0 : rawLoss
    const rating = isUserMove ? userRating : opponentRating
    const playedUci = `${move.from}${move.to}${move.promotion ?? ''}`
    const brilliant = evaluateBrilliantGates({
      fenBefore,
      playedUci,
      mover,
      rating,
      evalBeforeCp: cpForMover(evalBefore.cp, mover),
      evalAfterCp: cpForMover(evalAfter.cp, mover),
      bestCp: cpForMover(evalBefore.cp, mover),
      candidates: candidateLines,
      pvAfter: afterPosition.lines[0]?.pvUci ?? [],
    }).brilliant
    const great = isGreatMove({
      epBefore,
      epAfter,
      candidates: candidateLines,
      mover,
    })
    const miss = isMiss({
      previousOpponentEpLost: previousEpLost,
      epBefore,
      epAfter,
    })
    const quality = applyMoveOverrides({
      base: baseQuality,
      isBook: isBookMove(move.after, moveNumber),
      great,
      miss,
      brilliant,
    })
    const accuracy = deliversMate ? 100 : moveAccuracy(evalBefore, evalAfter, mover)
    const phase = phaseOf(moveNumber, fenBefore)
    const bestSan = uciToSan(fenBefore, evalBefore.bestMove)

    if (isUserMove) {
      const endgameType = phase === 'endgame' ? endgameTypeOf(fenBefore) : null
      const clockLeft = parseClk(comments.get(move.after))
      const bucket = phaseStats[phase]
      bucket.total += 1
      totalMoves += 1
      totalLoss += loss
      phaseAcpl[phase].totalLoss += loss
      phaseAcpl[phase].moves += 1
      qualityStats[quality] += 1
      userMoveAccuracies.push(accuracy)
      userEpLosses.push(epLost)

      if (classification !== 'fine') bucket[classification] += 1
      if (clockLeft != null) {
        const clock = clockStats[clockBucket(clockLeft)]
        clock.total += 1
        if (classification !== 'fine') clock[classification] += 1
      }
      if (endgameType) {
        const eg = endgameStats[endgameType]
        eg.total += 1
        if (classification !== 'fine') eg[classification] += 1
        recordEndgameAccuracy(endgameAccuracyStats, endgameType, accuracy)
      }

      if (!seenEndgame && phase === 'endgame') {
        seenEndgame = true
        endgameEntryEp = epBefore
        endgameEntry = classifyEndgameEntry(epBefore)
        const imbalance = materialImbalance(fenBefore, userIsWhite ? 'w' : 'b')
        if (imbalance >= 3) {
          endgameUp = true
          endgameOpportunities = 1
        }
      }

      if (quality !== 'book') {
        recordStrategyMove(
          strategyStats,
          classifyPositionStructure(fenBefore),
          classifyStrategyThemes({
            fenBefore,
            bestUci: evalBefore.bestMove,
            side: color,
          }),
          accuracy,
        )
      }

      if (classification === 'blunder') blunderCount += 1
      if (classification === 'mistake') mistakeCount += 1
      if (classification === 'inaccuracy') inaccuracyCount += 1

      userMoveQualities.push(quality)

      if (includePlies) {
        plies.push({
          ply: i,
          moveNumber,
          san: move.san,
          from: move.from,
          to: move.to,
          color: mover,
          fenBefore,
          fenAfter: move.after,
          evalCp: evalAfter.cp,
          mate: evalAfter.mate,
          isUserMove: true,
          loss,
          accuracy,
          epLost,
          quality,
          classification,
          bestSan,
          bestUci: evalBefore.bestMove || null,
        })
      }

      if (classification !== 'fine') {
        const mateAvailable =
          evalBefore.mateForStm != null && evalBefore.mateForStm > 0
        const motif = detectMotif({
          fenBefore,
          userFrom: move.from as Square,
          userTo: move.to as Square,
          userSan: move.san,
          punishUci: evalAfter.bestMove,
          mateForUser: mateAvailable && !deliversMate && !best,
          bestUci: evalBefore.bestMove,
          loss,
          deliveredMate: deliversMate,
        })
        const qualityFlag = classification
        const position = {
          username: user,
          playedOn: date,
          opponent,
          color,
          moveNumber,
          san: move.san,
          loss,
          classification,
          quality: qualityFlag,
          phase,
          endgameType,
          clockLeft,
          fenBefore,
          gameLink: game.url,
          motif,
          motifKind: motif ? (isOmissionMotif(motif) ? ('omission' as const) : ('commission' as const)) : null,
          timeClass: typeof timeClass === 'string' ? timeClass : null,
        }
        flagged.push(position)
        options?.onFlagged?.(position)
      }
    } else if (includePlies) {
      opponentTotalMoves += 1
      opponentTotalLoss += loss
      opponentQualityStats[quality] += 1
      opponentMoveAccuracies.push(accuracy)
      opponentEpLosses.push(epLost)
      const oppBucket = opponentPhaseStats[phase]
      oppBucket.total += 1
      if (classification !== 'fine') oppBucket[classification] += 1
      opponentPhaseAcpl[phase].totalLoss += loss
      opponentPhaseAcpl[phase].moves += 1

      plies.push({
        ply: i,
        moveNumber,
        san: move.san,
        from: move.from,
        to: move.to,
        color: mover,
        fenBefore,
        fenAfter: move.after,
        evalCp: evalAfter.cp,
        mate: evalAfter.mate,
        isUserMove: false,
        loss,
        accuracy,
        epLost,
        quality,
        classification,
        bestSan,
        bestUci: evalBefore.bestMove || null,
      })
    }

    previousEpLost = epLost
    beforePosition = afterPosition
    options?.onPly?.({ ply: i + 1, plyTotal: history.length })
  }

  let recoveryMoves = 0
  let recoveryErrors = 0
  for (let i = 0; i < userMoveQualities.length; i++) {
    if (userMoveQualities[i] !== 'blunder') continue
    for (let j = 1; j <= 5 && i + j < userMoveQualities.length; j++) {
      recoveryMoves += 1
      const q = userMoveQualities[i + j]!
      if (q === 'inaccuracy' || q === 'mistake' || q === 'blunder') recoveryErrors += 1
    }
  }

  const result = outcomeFor(
    userIsWhite,
    headers.Result ?? '*',
    game.whiteResult,
    game.blackResult,
  )
  const acpl = totalMoves ? Math.round((Math.min(totalLoss, totalMoves * 1000) / totalMoves) * 10) / 10 : 0
  const opponentAcpl = opponentTotalMoves
    ? Math.round((opponentTotalLoss / opponentTotalMoves) * 10) / 10
    : 0
  const accuracyPct = userMoveAccuracies.length
    ? averageAccuracy(userMoveAccuracies)
    : accuracyFromAcpl(acpl)
  const opponentAccuracyPct = opponentMoveAccuracies.length
    ? averageAccuracy(opponentMoveAccuracies)
    : opponentTotalMoves
      ? accuracyFromAcpl(opponentAcpl)
      : 0

  return {
    username: user,
    playedOn: date,
    opponent,
    color,
    result,
    blunderCount,
    mistakeCount,
    inaccuracyCount,
    totalMoves,
    phaseStats,
    clockStats,
    qualityStats,
    epLosses: userEpLosses,
    acpl,
    accuracyPct,
    phaseAcpl,
    endgameStats,
    endgameConversion: applyEndgameResult(
      {
        ...endgameConversion,
        opportunities: endgameOpportunities,
        conversions: endgameUp && result === 'win' ? 1 : 0,
      },
      endgameEntry,
      endgameEntryEp,
      result,
    ),
    endgameAccuracyStats,
    strategyStats,
    analysisVersion: ANALYSIS_VERSION,
    recoveryStats: { moves: recoveryMoves, errors: recoveryErrors },
    openingEco,
    openingName,
    timeClass: typeof timeClass === 'string' ? timeClass : null,
    opponentRating,
    userRating,
    gameLink: game.url,
    endTime: game.endTime,
    flagged,
    analysisBudget: options?.analysisBudget,
    whiteUsername: game.white || headers.White || white,
    blackUsername: game.black || headers.Black || black,
    ...(includePlies
      ? {
          plies,
          evalCurve,
          opponentQualityStats,
          opponentAcpl,
          opponentAccuracyPct,
          opponentTotalMoves,
          opponentPhaseStats,
          opponentPhaseAcpl,
          opponentEpLosses,
        }
      : {}),
  }
}
