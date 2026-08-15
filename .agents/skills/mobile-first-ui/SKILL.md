---
name: mobile-first-ui
description: >-
  Design and audit LEAK UI mobile-first. Use when building or changing layout,
  navigation, forms, charts, tables, boards, or any page chrome; when the user
  mentions mobile, responsive, tap targets, viewport, safe area, or design
  flaws; or when adding a new route or component that users will see on a phone.
---

# Mobile-first UI (LEAK)

LEAK is used on phones first. Write the **narrow layout as the default**. Desktop is an enhancement (`sm:` / `md:` / `lg:`), never the base.

Keep the existing aesthetic: dark canvas, IBM Plex, sharp corners, no generic AI slop.

## Workflow

1. Design the 360px column first (one column, full-width actions, no hover-only affordances).
2. Add breakpoints only when a second column or inline chrome earns the width.
3. Run the [checklist](checklist.md) before calling the work done.
4. If a board page is involved, protect the square: chrome must yield (`min-h-0`, `FittedBoardFrame`).

## Breakpoints

| Width | Use for |
| --- | --- |
| default (< 640) | Single column. Stack. Full-width primary actions. |
| `sm:` (640) | Inline nav, 2-up filters, table instead of cards. |
| `md:` (768) | Chart pairs (`Section` two-col). |
| `lg:` (1024) | Board + side panel. |

Do not hide essential identity (avatar, current user) behind `sm:`. Do not wrap six nav links — scroll them.

## Hard rules

- **Tap targets** ≥ 44px (`min-h-11`, `min-w-11` if icon-only). `py-1.5` + `text-xs` is not enough.
- **Inputs / selects** stay ≥ 16px on small screens (global CSS already forces this). Do not shrink them to dodge zoom.
- **Safe area**: header uses `env(safe-area-inset-top)`; main/footer use left/right/bottom insets. Viewport must include `viewport-fit=cover`.
- **Primary CTA** is full width on mobile (`w-full sm:w-auto`), never a text-only link next to a tiny button.
- **Wide data**: cards or a labeled list on mobile; `overflow-x-auto` tables only from `sm:` up. Never a 7-row stacked grid that used to be columns.
- **Charts**: label and value on one row, bar on the next (`NamedBarList` pattern). Do not reserve a 9rem label column on a 360px screen.
- **Nav**: one horizontal scroll row on small screens (`overflow-x-auto`, `shrink-0`, no wrap). Desktop can be inline in the header.
- **Dense board pages** (`dense` AppShell): no extra vertical padding, no second chrome block that clips the board.

## Tailwind habit

```
/* wrong — desktop first */
hidden sm:flex
mt-10 px-3 py-1.5
grid-cols-[9rem_1fr_auto]

/* right — phone first */
flex overflow-x-auto sm:contents
mt-4 min-h-11 sm:mt-8
grid-cols-[1fr_auto] sm:grid-cols-[9rem_1fr_auto]
```

Unprefixed utilities are the phone. Prefixes add room.

## When auditing

Report flaws as a table:

| Before | After | Why |
| --- | --- | --- |
| `py-1.5 text-xs` on a control | `min-h-11 px-3` | Thumb misses sub-44px hits |

Fix the flaws in the same pass unless the user only asked for the audit.
