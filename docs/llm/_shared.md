---
tags:
  - audience/llm
  - domain/shared
---

# _shared

Job: product chrome, tokens, boards, query defaults.

Owns: `src/components/AppShell.tsx`, `src/components/ui/**`, `src/styles.css`, `src/lib/queries.ts`, `playerCache.ts`, `idbCache.ts`, `legalMoves.ts`, `boardTheme.ts`, `chartTheme.ts`, `FittedBoardFrame.tsx`.

Depends: `_platform`, `_identity` (avatar, owner).

MUST:
- Phone-first. Tap ≥ 44px. Safe-area + `viewport-fit=cover`. Inputs ≥ 16px.
- Dense board pages: `100dvh`, no footer, board from min leftover dimension.
- Analysis nav: one `overflow-x-auto` row, no wrap.
- Press-scale on normal buttons only (not quiet/list/review).
- Chart colors: green improve, red-orange harm, bone secondary, square caps.
- Player queries refetch on mount/focus; global queries 30s stale, no focus refetch.

MUST NOT: desktop-first layouts; width-only board sizing; hover-only essential actions.

See humans: `docs/humans/_shared/Shared.md`. Rule: `.cursor/rules/ui-shell.mdc`.
