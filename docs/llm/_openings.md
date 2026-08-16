---
tags:
  - audience/llm
  - domain/openings
---

# _openings

Job: repertoire recall + ideas; pawn-structure lab; on-demand evidence-backed courses.

Owns: `src/lib/openings/**`, `OpeningTrainer.tsx`, `OpeningChooser.tsx`, `OpeningLesson.tsx`, `PawnStructureLab.tsx`, `trainer.$username.tsx`, tables `openings` `opening_nodes` `node_progress` `structure_targets` `opening_generation_jobs` `opening_explorer_cache` `opening_packs`.

Provenance:
- PGN/ECO → moves
- Lichess explorer (club + masters) → frequencies, deviation nodes, model-game refs. **No reasons. No invented freqs on cards.**
- Authored cards → explanations only, **no evals**
- Imported PGN/Study comments → personal repertoire only (`provenance: imported`)
- Deterministic templates → structured commentary from board/engine/explorer evidence. Omit unproven sections. Engine values are evidence, not prose evals.
- Lesson structure identity comes from the **line’s pawn FEN**, not from a name catch-all (Old Sicilian is not Scheveningen)
- Heuristic/template move text is board geometry (what the move occupies/blocks/unblocks), not a canned family paragraph

MUST: `due_at` from `min(recall_ease, understanding_ease)`.
MUST: reason-tag enum; prophylaxis/breaks/squares need concrete targets (`validate.ts`).
MUST: generated commentary fails validation if a named square is off-board, an attack/defense is false, a blocked pawn break is taught as currently legal, stats are unattributed, or the stored FEN does not match the move.
MUST: session 8 recall, MCQ on first 5 (`session.ts`).
MUST: chooser = played lines first, color first, ask to learn; else ECO search + client `openingFromDownloadHit`; PGN/Study import merges by FEN into personal openings.
MUST: foundations/new download → `lesson` phase; weak-spot → skip lesson.
MUST: if seed card matches name/ECO/side, use authored card not stub.
MUST: download busy = `downloadingKey === openingHitKey(hit)`, not a global label.
MUST: trainable = repertoire moves with ≥1 valid reason; exclude explorer-only.
MUST: explorer replies ≥1.5% in ±100 rating; wait a full minute on HTTP 429; keep club and masters evidence separate.
MUST: course generation is chunked and resumable (`opening_generation_jobs`). Show stages (Starter ready / Collecting common replies / Checking moves / Building middlegame plans / Ready). Do not promise a wall-clock duration.
MUST: shared packs cache by normalized opening + side + rating band + `COMMENTARY_GENERATOR_VERSION`. Personal progress/comments stay private.
MUST: structure id = pawn-only FEN; games tag name/ECO; flags tag FEN.
Vienna = teaching quality bar.

Shared openings: `username IS NULL`. Progress only if authenticated.

Rule: `.cursor/rules/opening-trainer.mdc`.
