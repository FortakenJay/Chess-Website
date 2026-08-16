---
tags:
  - audience/llm
  - vault/home
aliases:
  - LLM index
---

# LLM INDEX

Read this file first. Then `SYSTEM.md`. Then the `_*.md` files for domains you will touch. Do not ingest `docs/humans/` unless you need a diagram explained to a person.

Human vault: `docs/humans/`. Cursor constraints: `.cursor/rules/*.mdc`. If vault and rule disagree, **code + Cursor rule win**; patch the vault in the same change.

## Load order

1. `docs/llm/SYSTEM.md` — invariants
2. `docs/llm/FILEMAP.md` — where code lives
3. `docs/llm/SCHEMA.md` — tables / RLS
4. `docs/llm/ROUTES.md` — URLs
5. Domain file matching the glob you are editing

## Domain files

| File | Edit globs |
| --- | --- |
| `_platform.md` | `vite.config.*` `vercel.json` `package.json` `src/router.tsx` |
| `_shared.md` | `src/components/ui/**` `AppShell.tsx` `styles.css` `queries.ts` |
| `_identity.md` | `src/lib/auth.tsx` `profile.ts` `avatar*` `login.tsx` `signup.tsx` |
| `_chesscom.md` | `src/lib/chesscom.ts` `chesscom.functions.ts` |
| `_sync.md` | `src/lib/sync/**` `backgroundSync.tsx` `api/sync-user.ts` `analyze.$username.tsx` |
| `_analysis.md` | `src/lib/analysis/**` `analyzeClient.ts` |
| `_persistence.md` | `src/lib/supabase/**` `persist.ts` `playerCache.ts` `supabase/migrations/**` |
| `_insights.md` | `src/routes/results*` `resultsModel.ts` `playstyle.ts` `stats.ts` `grades.ts` `*Insights.tsx` |
| `_practice.md` | `DrillBoard.tsx` `PositionsTable.tsx` `drill.$username.tsx` `positions.$username.tsx` |
| `_puzzles.md` | `src/lib/puzzles/**` `PuzzleBoard.tsx` `puzzles.$username.tsx` |
| `_openings.md` | `src/lib/openings/**` `Opening*.tsx` `PawnStructureLab.tsx` `trainer.$username.tsx` |
| `_review.md` | `src/components/review/**` `review*.tsx` `parseGameMeta.ts` `reportStats.ts` |
| `_roadmap.md` | `src/lib/roadmap/**` `ChessRoadmap.tsx` `roadmap.$username.tsx` |
| `_landing.md` | `src/components/landing/**` `index.tsx` `preview.tsx` |

## Product in one paragraph

LEAK analyzes a Chess.com library in the browser (Stockfish WASM), stores game aggregates + leak-tier positions (not PGN, not review tapes), and trains via guess-before-reveal drills, Elo puzzles, and an opening trainer that splits moves / explorer / explanations.
