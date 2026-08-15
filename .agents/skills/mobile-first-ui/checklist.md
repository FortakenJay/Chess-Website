# Mobile-first checklist

Run this after any UI change. Fail closed: if unsure, treat it as a phone.

## Layout

- [ ] Default is one column. Multi-column only at `md:` / `lg:`.
- [ ] No horizontal page overflow at 360px (except intentional swipe rows).
- [ ] Sticky header + mobile nav still leave room for the page (board pages use `dense`).
- [ ] Safe-area insets applied (notch / home indicator).

## Touch

- [ ] Buttons, links-as-buttons, chips, segments, selects ≥ 44×44.
- [ ] Adjacent hits have ≥ 8px gap.
- [ ] Icon-only controls have `aria-label` and `min-w-11`.

## Type and forms

- [ ] Inputs/selects do not drop below 16px on small screens.
- [ ] Labels stay visible (not placeholder-only).
- [ ] Primary submit is full width on mobile.

## Navigation

- [ ] Analysis links scroll horizontally on small screens — they do not wrap into two cramped rows.
- [ ] Current user/avatar is visible without a desktop breakpoint.
- [ ] Skip link still works.

## Data

- [ ] Tables become cards or a stacked definition list below `sm:`.
- [ ] Chart labels sit with their values; bars are not squeezed beside a wide label column.
- [ ] Empty / loading / error states are readable without hover.

## Motion and a11y

- [ ] `:active` press exists; `prefers-reduced-motion` is respected (already in `styles.css`).
- [ ] Focus-visible outline is not removed.
- [ ] No hover-only information.

## Board pages

- [ ] Board is a square from `min(100cqw, 100cqh)` via `FittedBoardFrame`.
- [ ] Side panel stacks under the board below `lg:`.
- [ ] Header chrome does not clip the last rank.
