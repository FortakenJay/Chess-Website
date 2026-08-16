---
tags:
  - audience/human
  - domain/identity
aliases:
  - Auth
---

# Identity

Email/password session, then exactly one Chess.com username bound through `auth.uid()`. Avatars are cached in Storage but must not fail the link.

## Owns

- `src/lib/auth.tsx`, `profile.ts`, `avatar.ts`, `avatar.server.ts`
- `src/routes/login.tsx`, `signup.tsx`, `auth.callback.tsx`
- `profiles` table, RPCs `link_chess_username`, `linked_username`

## Depends on

[[Platform]] · [[Chess.com]] (handle + avatar URL)

```mermaid
sequenceDiagram
  actor User
  participant Form as SignupForm
  participant Chess as Chess.com
  participant Auth as Supabase Auth
  participant RPC as link_chess_username
  participant Store as Storage avatars

  User->>Form: email, password, handle
  Form->>Chess: validate handle exists
  Form->>Auth: signUp with handle in metadata
  Auth-->>User: session
  Form->>RPC: link_chess_username(handle)
  Note over RPC: auth.uid() only — no client user_id
  RPC->>Store: cache avatar
  Store--xRPC: download can fail
  RPC-->>Form: profile still linked
```

## Invariants

- Client never supplies `user_id` to the link RPC.
- Owner actions (sync, persist drills, save openings) only when route username equals `profiles.chess_com_username`.
- README still mentions magic-link; forms are passwords. Treat README as stale on this point.
