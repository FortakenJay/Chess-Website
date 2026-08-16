---
tags:
  - audience/llm
  - domain/sync
---

# _sync

Job: ingest Chess.com library into analyzed rows.

Owns: `src/lib/sync/plan.ts`, `runSync.ts`, `backgroundSync.tsx`, `analyze.$username.tsx`, `api/sync-user.ts`, `sync_state`.

Constants (`plan.ts`): `GAME_RETENTION_YEARS=2`, `DOWNLOAD_BATCH_MONTHS=2`, `SAVE_BATCH_GAMES=10`.

Modes: `full` retained months; `incremental` months that can contain games after cursor; `reanalyze` same months as full, caller selects stale rows.

MUST: browser = full/Sync now; cron = incremental after `last_game_end_time`.
MUST: `cutoff - 1` for Chess.com exclusive `>`.
MUST: purge 2y first; do not block sync on purge failure.
Cron: `MAX_SYNC_MS` default 8s; max 2 months if no cursor.

Rule: `.cursor/rules/sync.mdc`.
