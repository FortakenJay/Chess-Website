# Graph Report - C:\Users\miche\Documents\coding\Chess-Website  (2026-08-14)

## Corpus Check
- Corpus is ~29,002 words - fits in a single context window. You may not need a graph.

## Summary
- 499 nodes · 1234 edges · 17 communities (15 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Puzzles + phase types
- Results charts/stats
- Shell auth Chess.com
- Drill board positions
- Core game analysis
- Router and routes
- Stockfish engine I/O
- Runtime dependencies
- Sync persist cache
- TypeScript config
- Dev toolchain deps
- Motif detectors
- Lichess puzzle script
- Engine copy script
- Vite env types
- Vercel crons

## God Nodes (most connected - your core abstractions)
1. `normalizeUsername()` - 26 edges
2. `analyzeGame()` - 24 edges
3. `ResultsPage()` - 23 edges
4. `useAuth()` - 21 edges
5. `getBrowserClient()` - 17 edges
6. `loadPracticePuzzles()` - 14 edges
7. `compilerOptions` - 14 edges
8. `AppShell()` - 13 edges
9. `pct()` - 13 edges
10. `usePlayerData()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `AuthCallback()` --calls--> `getBrowserClient()`  [EXTRACTED]
  src/routes/auth.callback.tsx → src/lib/supabase/browser.ts
- `DrillBoard()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/DrillBoard.tsx → src/lib/auth.tsx
- `analyzeGame()` --calls--> `detectMotif()`  [EXTRACTED]
  src/lib/analysis/analyzeGame.ts → src/lib/analysis/motifs.ts
- `analyzeGame()` --calls--> `phaseOf()`  [EXTRACTED]
  src/lib/analysis/analyzeGame.ts → src/lib/analysis/phase.ts
- `analyzeGames()` --calls--> `analyzeGame()`  [EXTRACTED]
  src/lib/analyzeClient.ts → src/lib/analysis/analyzeGame.ts

## Import Cycles
- None detected.

## Communities (17 total, 2 thin omitted)

### Community 0 - "Puzzles + phase types"
Cohesion: 0.08
Nodes (49): NON_PAWN, nonPawnMaterial(), phaseOf(), Motif, Phase, CacheEntry, canUseIdb(), filterPuzzles() (+41 more)

### Community 1 - "Results charts/stats"
Cohesion: 0.08
Nodes (50): AccuracyTrendChart(), axis, ClockChart(), ColorChart(), DrillByMotifChart(), DrillTrendChart(), EndgameTypeChart(), grid (+42 more)

### Community 2 - "Shell auth Chess.com"
Cohesion: 0.10
Nodes (35): AppShell(), ProgressPanel(), ShellSkeleton(), SignInForm(), COMMON_PASSWORDS, FieldErrors, passwordIssue(), SignupForm() (+27 more)

### Community 3 - "Drill board positions"
Cohesion: 0.07
Nodes (36): ClassificationBadge(), STYLES, DrillBoard(), Reveal, HeroPosition(), SQUARE_STYLES, EMPTY_FILTERS, filterPositions() (+28 more)

### Community 4 - "Core game analysis"
Cohesion: 0.11
Nodes (40): analyzeGame(), outcomeFor(), playedBestMove(), playedOn(), accuracyFromAcpl(), centipawnLoss(), classify(), classifyQuality() (+32 more)

### Community 5 - "Router and routes"
Cohesion: 0.07
Nodes (32): getRouter(), Register, @tanstack/react-router, Route, Route, AuthCallback(), Route, Route (+24 more)

### Community 6 - "Stockfish engine I/O"
Cohesion: 0.13
Nodes (24): RawGame, toWhiteRelative(), absoluteUrl(), asmWorkerUrl(), createBrowserEngine(), createBrowserPort(), createWorkerPort(), emit() (+16 more)

### Community 7 - "Runtime dependencies"
Cohesion: 0.06
Nodes (30): chess.js, dependencies, chess.js, react, react-chessboard, react-dom, recharts, stockfish (+22 more)

### Community 8 - "Sync persist cache"
Cohesion: 0.15
Nodes (24): aborted(), BackgroundSyncContext, BackgroundSyncContextValue, BackgroundSyncProvider(), BackgroundSyncState, INITIAL_STATE, syncGames(), listArchives (+16 more)

### Community 9 - "TypeScript config"
Cohesion: 0.09
Nodes (23): DOM, DOM.Iterable, ES2022, scripts, ./src/*, vite/client, vite.config.ts, compilerOptions (+15 more)

### Community 10 - "Dev toolchain deps"
Cohesion: 0.09
Nodes (23): fzstd, nitro, devDependencies, fzstd, nitro, tailwindcss, @tailwindcss/vite, @types/node (+15 more)

### Community 11 - "Motif detectors"
Cohesion: 0.27
Nodes (19): at(), commissionMotifFromPunish(), coords(), detectMotif(), findPins(), isBackRank(), isDiscoveredAttack(), isFork() (+11 more)

### Community 12 - "Lichess puzzle script"
Cohesion: 0.20
Nodes (16): ANGLES, buildFromApi(), buildFromFullCsv(), fetchBatch(), LICHESS_TO_MOTIF, main(), motifFromThemes(), normalizeApiPuzzle() (+8 more)

### Community 13 - "Engine copy script"
Cohesion: 0.25
Nodes (6): asm, destDir, js, pkgDir, require, wasm

## Knowledge Gaps
- **116 isolated node(s):** `name`, `private`, `type`, `dev`, `build` (+111 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `normalizeUsername()` connect `Shell auth Chess.com` to `Sync persist cache`, `Puzzles + phase types`, `Drill board positions`, `Results charts/stats`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Shell auth Chess.com` to `Sync persist cache`, `Results charts/stats`, `Drill board positions`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `getBrowserClient()` connect `Shell auth Chess.com` to `Sync persist cache`, `Puzzles + phase types`, `Drill board positions`, `Router and routes`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `name`, `private`, `type` to the rest of the system?**
  _116 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Puzzles + phase types` be split into smaller, more focused modules?**
  _Cohesion score 0.08196721311475409 - nodes in this community are weakly interconnected._
- **Should `Results charts/stats` be split into smaller, more focused modules?**
  _Cohesion score 0.08408953418027829 - nodes in this community are weakly interconnected._
- **Should `Shell auth Chess.com` be split into smaller, more focused modules?**
  _Cohesion score 0.10014513788098693 - nodes in this community are weakly interconnected._