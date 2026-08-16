---
tags:
  - audience/human
  - domain/sync
aliases:
  - Library ingest
---

# Sync

Turns a Chess.com library into analyzed `games` + `flagged_positions`. Browser does the heavy pass. Cron only walks games newer than the cursor.

## Owns

- `src/lib/sync/plan.ts`, `runSync.ts`
- `src/lib/backgroundSync.tsx`, `src/routes/analyze.$username.tsx`
- `src/routes/api/sync-user.ts`
- `sync_state` table, `purge_expired_games`

## Depends on

[[Chess.com]] · [[Analysis]] · [[Persistence]] · [[Identity]] (owner only)

```mermaid
flowchart TB
  Start[Sync] --> Purge[purge older than 2y]
  Purge -->|failure ignored| Mode{mode}
  Mode -->|full| Months[all retained archive months]
  Mode -->|incremental| Newer[months that can contain games after cursor]
  Mode -->|reanalyze| Months
  Months --> Batch[2 months per download]
  Batch --> Analyze[Stockfish per game]
  Analyze --> Save[10 games per persist]
  Save --> Cursor[sync_state.last_game_end_time]
```

## Modes

| Mode | Months | Rows |
| --- | --- | --- |
| `full` | Retention window | New games |
| `incremental` | Months that may contain newer games | New games after cursor |
| `reanalyze` | Same months as full | Caller picks stale `analysis_version` |

Incremental passes `cutoff - 1` into Chess.com because their filter is exclusive `>`.

Cron: stop around `MAX_SYNC_MS` (8s default); if there is no cursor, scan at most two months.
