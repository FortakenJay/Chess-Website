---
tags:
  - audience/llm
---

# FILEMAP

Paths from repo root. Prefer the listed file over hunting.

## App frame

| Path | Role |
| --- | --- |
| `src/router.tsx` | QueryClient defaults (30s stale, no focus refetch) |
| `src/routes/__root.tsx` | Root layout |
| `src/routeTree.gen.ts` | Generated. Do not edit |
| `src/components/AppShell.tsx` | Nav, owner chrome, avatar |
| `src/components/ui/index.ts` | Buttons, panels, filters, skeletons |
| `src/styles.css` | Tokens |
| `src/lib/queries.ts` | Player data queries (fresh on mount/focus) |
| `src/lib/playerCache.ts` | IndexedDB |
| `src/lib/legalMoves.ts` | Selection vs move |
| `src/components/FittedBoardFrame.tsx` | Square board in leftover box |

## Identity

| Path | Role |
| --- | --- |
| `src/lib/auth.tsx` | Session |
| `src/lib/profile.ts` | Link username; avatar failure isolated |
| `src/lib/avatar.ts` `avatar.server.ts` | Chess.com avatar cache |
| `src/routes/login.tsx` `signup.tsx` `auth.callback.tsx` | Password + PKCE |

## Chess.com / sync / analysis

| Path | Role |
| --- | --- |
| `src/lib/chesscom.ts` | HTTP, identity, PGN headers, rating order |
| `src/lib/chesscom.functions.ts` | Server function boundary |
| `src/lib/sync/plan.ts` | Retention, modes, batch sizes |
| `src/lib/sync/runSync.ts` | Orchestration, purge, exclusive cutoff |
| `src/lib/backgroundSync.tsx` | Browser sync |
| `src/routes/api/sync-user.ts` | Cron, MAX_SYNC_MS |
| `src/lib/analysis/engine.ts` | Browser WASM/ASM |
| `src/lib/analysis/engine.node.ts` | Server engine |
| `src/lib/analysis/analyzeGame.ts` | Full game pipeline |
| `src/lib/analysis/classify.ts` | Accuracy, RMS, usableAccuracy |
| `src/lib/analysis/openingBook.ts` | ECO board FEN |
| `src/lib/analysis/phase.ts` | Opening/endgame cutoffs |
| `src/lib/analysis/types.ts` | `ANALYSIS_VERSION`, FlaggedPosition |
| `src/lib/analyzeClient.ts` | `includePlies` never persisted |
| `scripts/copy-engine.mjs` | postinstall WASM |

## Persistence

| Path | Role |
| --- | --- |
| `src/lib/persist.ts` | Game + flag upserts |
| `src/lib/supabase/browser.ts` `admin.ts` | Clients |
| `src/lib/supabase/database.types.ts` | Generated types |
| `supabase/migrations/` | Schema + RLS |

## Product surfaces

| Path | Role |
| --- | --- |
| `src/lib/resultsModel.ts` `playstyle.ts` `stats.ts` `strategyStats.ts` `grades.ts` | Insights |
| `src/components/ResultsCharts.tsx` `InsightStats.tsx` | Charts |
| `src/components/DrillBoard.tsx` | Practice |
| `src/lib/puzzles/` | Catalog load/cache/weakness |
| `src/lib/openings/` | Trainer, search, lessons, structures |
| `src/lib/roadmap/` | Topics + study FENs |
| `src/components/review/` | Ephemeral review UI |
| `src/components/landing/` | Marketing |

## Cursor rules (enforced while coding)

`.cursor/rules/{platform,auth,chess-com-integration,sync,analysis,persistence,insights,practice,puzzles,opening-trainer,review,landing-marketing,ui-shell}.mdc`
