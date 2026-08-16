---
tags:
  - audience/llm
---

# ROUTES

File routes in `src/routes/`. `$username` = Chess.com handle.

| Path | File | Authz |
| --- | --- | --- |
| `/` | `index.tsx` | Logged-out landing; linked → Results; signed-in unbound → UsernamePrompt |
| `/login` | `login.tsx` | Public |
| `/signup` | `signup.tsx` | Public; validates handle before signup |
| `/auth/callback` | `auth.callback.tsx` | PKCE |
| `/results/$username` | `results.$username.tsx` | Public read |
| `/results/$username/` | `results.$username.index.tsx` | Overview |
| `/results/$username/openings` | `results.$username.openings.tsx` | White/Black lists, no peer column |
| `/results/$username/strategy` | `results.$username.strategy.tsx` | Peer RPC |
| `/results/$username/endgames` | `results.$username.endgames.tsx` | Peer RPC |
| `/positions/$username` | `positions.$username.tsx` | Public read; filters → drill query |
| `/drill/$username` | `drill.$username.tsx` | Public practice; attempts owner-only |
| `/puzzles/$username` | `puzzles.$username.tsx` | Public |
| `/trainer/$username` | `trainer.$username.tsx` | Public catalog; progress owner-only |
| `/roadmap/$username` | `roadmap.$username.tsx` | `?tab=structures&structure=` |
| `/review` | `review.tsx` / `review.index.tsx` | Ephemeral |
| `/review/$username` | `review.$username.tsx` | Ephemeral; ~60ms movetime |
| `/analyze/$username` | `analyze.$username.tsx` | Owner sync UI |
| `/preview` | `preview.tsx` | Marketing proof |
| `/strategy/$username` | `strategy.$username.tsx` | Redirect → Results strategy |
| `/endgames/$username` | `endgames.$username.tsx` | Redirect → Results endgames |
| `/openings/$username` | `openings.$username.tsx` | Redirect → Results openings |
| `/api/sync-user` | `api/sync-user.ts` | `Authorization: Bearer CRON_SECRET` |

AppShell nav: Results, Positions, Drill, Puzzles, Trainer, Roadmap, Review. Owner-only Analyze/Sync when `profile.chess_com_username === route username`.
