---
tags:
  - audience/llm
  - domain/identity
---

# _identity

Job: session + one Chess.com handle per user.

Owns: `auth.tsx`, `profile.ts`, `avatar.ts`, `avatar.server.ts`, `login.tsx`, `signup.tsx`, `auth.callback.tsx`, `profiles`, RPCs `link_chess_username` / `linked_username`.

Flow: validate handle → signUp (handle in metadata) → session → `link_chess_username(handle)` using `auth.uid()` → cache avatar (failure OK).

MUST NOT: pass `user_id` from client into link RPC.
MUST NOT: fail username bind because avatar Storage failed.
MUST: owner mutations only if route username === `profiles.chess_com_username`.

Auth is email/password + PKCE. README magic-link is stale — do not reintroduce copy that claims magic-link unless you change the forms.

Rule: `.cursor/rules/auth.mdc`.
