---
tags:
  - audience/llm
  - domain/persistence
---

# _persistence

Job: Supabase rows, RLS, client caches.

Owns: `src/lib/supabase/**`, `persist.ts`, `playerCache.ts`, `idbCache.ts`, `supabase/migrations/**`.

Stored: `games` aggregates, `flagged_positions`, `period_summary`, trainer tables, `puzzles`.
Not stored: PGN, Review tape, cosmetic qualities.

MUST: public SELECT analysis; writes require `username = linked_username()`.
MUST: puzzle catalog writes via service role (`admin.ts`).
MUST: persist ~200-row chunks; replace flags by `game_link`.
MUST: IndexedDB failures are non-fatal.

Peer RPCs return null below sample thresholds — UI shows `—`, never fake numbers.

Types: `database.types.ts`. After schema change, regenerate types.

Rule: `.cursor/rules/persistence.mdc`. Schema map: `SCHEMA.md`.
