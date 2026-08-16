---
tags:
  - audience/llm
  - domain/landing
---

# _landing

Job: logged-out conversion.

Owns: `src/components/landing/**`, `src/routes/index.tsx`, `preview.tsx`, `HeroPosition.tsx`.

`/` :
- not ready → shell skeleton
- linked username → Navigate Results
- signed in, no profile → UsernamePrompt
- else → LandingPage

CTAs in order: Sign up, Free game review, Preview (fixed player).
Hero: CSS 3D parallax (no scroll listeners); Italian position; pieces lift as leaks.
MUST: reduce-motion flattens; reduce-transparency drops glass.
MUST: use live product widgets, not screenshots.
MUST NOT: introduce a second authenticated design system — product chrome is `_shared` tokens.

Rule: `.cursor/rules/landing-marketing.mdc` (palette note may lag `_shared` unification — follow `ui-shell.mdc` inside the app).
