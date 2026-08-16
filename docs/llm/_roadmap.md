---
tags:
  - audience/llm
  - domain/roadmap
---

# _roadmap

Job: named study topics with playable positions.

Owns: `src/lib/roadmap/topics.ts`, `study.ts`, `progress.ts`, `ChessRoadmap.tsx`, `roadmap.$username.tsx`.

MUST: Strategy/Endgame nodes have real study FENs.
MUST NOT: mark complete because games were played.
MUST: practice link → canonical FEN board or structure lab (`/trainer/$username?tab=structures&structure=`).
MUST NOT: send people to an empty opening chooser.

Progress helpers in `progress.ts` are explicit study actions, not library volume.
