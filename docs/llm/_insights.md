---
tags:
  - audience/llm
  - domain/insights
---

# _insights

Job: Results IA and aggregates.

Owns: `results.$username*.tsx`, `resultsModel.ts`, `playstyle.ts`, `stats.ts`, `strategyStats.ts`, `grades.ts`, `ResultsCharts.tsx`, `InsightStats.tsx`, `OpeningRepertoire.tsx`, `StrategyInsights.tsx`, `EndgameInsights.tsx`.

MUST: nest Overview/Openings/Strategy/Endgames under `/results/$username`; redirect legacy routes.
MUST: RMS accuracy (opening may ACPL-fallback legacy).
MUST: `strategy_peer_stats` / `endgame_peer_stats`; null → `—`.
MUST NOT: opening similar-rating column.
MUST: White vs Black opening lists (same swap as trainer).
MUST: time class Overall|Bullet|Blitz|Rapid|Daily|Other, passed to RPCs.
MUST: `usableAccuracy` / `usableAcpl` exclude mate-inflated rows.
MUST NOT: use `reportStats.peerPercentile` here.
MUST: Overview playstyle from stored `strategy_stats` (open / closed / semi_closed RMS) plus color, clock, motif kind, time class — no peer RPC.
MUST: playstyle traits need a real split (2 pt error-rate, 3 pt accuracy, 60% motif share) and one-decimal labels.

Grades: `gradeForAccuracy` 90/85/78/70/60; conversion depends on better/equal/worse.

Rule: `.cursor/rules/insights.mdc`.
