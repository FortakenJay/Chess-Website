---
tags:
  - audience/llm
---

# SCHEMA

Source of truth: `src/lib/supabase/database.types.ts` + `supabase/migrations/`.

## Tables

| Table | Key / notes |
| --- | --- |
| `profiles` | `id` = auth uid. `chess_com_username` unique |
| `games` | `(username, game_link)` upsert. Aggregates JSON. **No PGN**. `analysis_version` |
| `flagged_positions` | Leak tier. `(username, game_link, move_number)` identity in app |
| `drill_attempts` | Owner only. `matched_best`, `matched_historical_mistake` |
| `period_summary` | Rollup alongside client aggregation |
| `sync_state` | `last_game_end_time` cursor |
| `puzzles` | Public read. Service-role write |
| `openings` | `username IS NULL` = shared catalog; else personal. `generator_version`, `pack_key`, `generation_status` |
| `opening_nodes` | Moves + optional explorer fields + structured `commentary` jsonb. Reasons validated |
| `opening_generation_jobs` | Resumable on-demand course build. Owner only |
| `opening_explorer_cache` | Lichess club/masters slices by FEN. Public read |
| `opening_packs` | Shared evidence-backed packs keyed by opening+side+band+generator version |
| `node_progress` | `recall_ease`, `understanding_ease`, `due_at` |
| `structure_targets` | Pawn-structure drill targets |

`games` notable columns: `accuracy_pct`, `acpl`, `phase_stats`, `clock_stats`, `quality_stats`, `strategy_stats`, `endgame_accuracy_stats`, `endgame_conversion`, `opening_eco`, `opening_name`, `time_class`, `analysis_budget`, `move_ep_losses`.

`flagged_positions` notable: `classification`, `fen_before`, `san`, `color`, `phase`, `motif`, `motif_kind`, `clock_left`, `endgame_type`, `quality`.

## RPCs

| RPC | Use |
| --- | --- |
| `link_chess_username(p_username)` | Bind handle; `auth.uid()` only |
| `linked_username()` | Current user's handle |
| `purge_expired_games` | 2-year retention |
| `normalize_time_class` | Filter buckets |
| `strategy_peer_stats` | Rating-band cohort; null under sample |
| `endgame_peer_stats` | Same. No opening peer RPC |

## RLS (intent)

- Analysis tables: anonymous SELECT of public rows; INSERT/UPDATE/DELETE when username is linked owner.
- `puzzles`: SELECT public; writes service role.
- Opening progress: authenticated owner.
- Shared openings readable by all.

## Migrations (order)

1. `20260813000000_init_chess_analysis.sql`
2. `20260813000001_rls_and_fk_index_fixes.sql`
3. `20260814000000_extended_analysis_metrics.sql`
4. `20260814230807_puzzles_catalog.sql`
5. `20260815000000_react_doctor_security.sql`
6. `20260815010633_purge_games_older_than_2_years.sql`
7. `20260815013014_purge_games_retention_cron.sql`
8. `20260815014357_store_move_ep_and_analysis_budget.sql`
9. `20260815054500_chesscom_avatars.sql`
10. `20260815200000_strategy_endgame_insights.sql`
11. `20260815210000_opening_trainer.sql`
12. `20260816000000_opening_commentary.sql`
