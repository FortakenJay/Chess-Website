---
tags:
  - audience/human
  - decisions
aliases:
  - ADRs
---

# Decision log

Rolled-up chose / considered / why. Domain notes hold the local story. Cursor mirrors these in `.cursor/rules/*.mdc`. `⚠️` means the code is the only source — nobody wrote a product why yet.

## Platform

| Chose | Considered | Why |
| --- | --- | --- |
| TanStack Start + Query + Vite + Nitro + React 19 | — | Current stack. Formal why ⚠️ |
| Vercel + daily `0 6 * * *` cron | — | Hobby allows one daily cron. Formal why ⚠️ |
| Browser Stockfish for backfill; cron incremental only | Server-side full backfill | Cron time budget is tiny; WASM already ships to the client |
| Query staleTime 30s, no refetch on focus; player data refetches | Global refetch-on-focus | ⚠️ |
| Stockfish 18 `lite-single` WASM + ASM copy on postinstall | Full NNUE in the browser | Size / private-mode fallback |

## Identity

| Chose | Considered | Why |
| --- | --- | --- |
| Email/password + PKCE | Magic link (README stale) | ⚠️ |
| `link_chess_username` uses `auth.uid()` only | Client-supplied `user_id` | RLS / spoofing |
| Validate handle before signup, link after session | Link during signup request | Session must exist for `auth.uid()` |
| Keep profile if avatar download fails | Fail the whole link | Avatar is cosmetic |
| Owner chrome only when route username = linked username | — | Matches write RLS |

## Chess.com

| Chose | Considered | Why |
| --- | --- | --- |
| Server functions for public API | Browser fetch | ⚠️ User-Agent + hide keys |
| Pathname as game id | Full URL | Live/daily ids are unique enough |
| Regex PGN headers in chesscom client | chess.js at module top | Avoid chess.js in that SSR graph |
| Standard chess only | Variants | Engine + drills assume 8x8 chess |
| `endTime` over PGN Date | `[Date]` / `[UTCDate]` | Daily games keep start date in headers |
| Rating order blitz → rapid → bullet → daily | — | Puzzle Elo. Why this order ⚠️ |

## Sync

| Chose | Considered | Why |
| --- | --- | --- |
| 2-year retention, aligned purge | Forever history | DB + Chess.com scan stay on one window. Why 2y ⚠️ |
| `full` / `incremental` / `reanalyze` | One scan | Different jobs, same planner |
| Incremental `cutoff - 1` | Raw timestamp | Chess.com filter is exclusive `>` |
| Cron ≤ ~8s, max 2 months if no cursor | Long cron | Platform time box. Values ⚠️ |
| 2 months download / 10 games save | — | ⚠️ |
| Purge failure does not block sync | Hard-fail | Best-effort cleanup |

## Analysis

| Chose | Considered | Why |
| --- | --- | --- |
| 12k nodes MultiPV 4 persisted; movetime interactive | Movetime everywhere | Interactive Review needs snappy evals |
| WASM then remembered ASM fallback | ASM only | WASM fails in some private-mode / worker cases |
| Worker, then main thread | Main thread only | ⚠️ |
| Win%-drop accuracy, RMS game accuracy | Raw ACPL / arithmetic mean | Mean reads 5–15 points high vs Chess.com |
| Board-only FEN through move 10 for ECO | Full FEN | Clocks/EP break transpositions |
| Persist leak tier only | Persist brilliant/book | Drills would train on cosmetics |
| Opening ≤ move 10; endgame ≤ 13 non-pawn | Other cutoffs | Locked by tests. Product why ⚠️ |

## Persistence

| Chose | Considered | Why |
| --- | --- | --- |
| Aggregates + flags; no PGN; no review tape | Store PGN | Review is ephemeral; PGN why ⚠️ |
| Public reads, owner writes | Login wall on Results | Username preview is a product path |
| Puzzle catalog service-role writes | Authenticated writes | Shared catalog is not user data |
| `analysis_version` stale rows | Silent schema drift | Bump when JSON/scoring changes |
| IndexedDB cache, ignore quota errors | Throw | Private mode must still run |
| 200-row persist chunks | — | ⚠️ |

## Insights

| Chose | Considered | Why |
| --- | --- | --- |
| Nested Results sections, redirect legacy | Top-level Strategy/Endgames | One Results link |
| Real SQL peers for strategy/endgame | Review's synthetic percentile | Review percentile is not a cohort |
| No opening peer column | Empty `—` column | Looks like missing data |
| White/Black opening lists | Mixed color | Different repertoires |
| `usableAccuracy` drops mate-inflated rows | Plot everything | 0% / 5000 ACPL flattens charts |

## Practice / puzzles / openings / review

See [[Practice]], [[Puzzles]], [[Openings]], [[Review]]. Short version: hide the answer; only leak tiers; catalog is multi-source; openings split moves / explorer / explanations; Review never writes.
