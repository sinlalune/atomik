---
type: Atomik Learning Note
title: 'Learning: design tokens, themes, and budgeted glass'
description: Beginner-first walkthrough of the S07n design system — how one token vocabulary, a theme family, and a perf-budgeted glass treatment make every UI change read as one product.
tags: [learning]
timestamp: 2026-07-21T00:00:00Z
---

# Learning: design tokens, themes, and budgeted glass

*Covers CP-MVP-007 S07m/S07n (2026-07-21). Written the same day — the
first-use rule back in action after the coverage stall.*

## Who this is for and what you can do afterwards

You can read CSS but have never built a design system. Afterwards you
can add a themed, accessible control that matches every other control,
add a fifth theme in ~10 lines, and explain why the audit found 18
font sizes and ~30 spacing values where 4+5 now serve.

## The technologies involved, from zero

**CSS custom properties (tokens).** A custom property (`--fs-md: 0.8rem`)
is a named value that cascades like any inherited style. A *design
token* is a custom property with a CONTRACT: chrome may only speak the
token vocabulary in `:root` of
`apps/desktop/renderer/src/styles.css` (`--fs-*`, `--space-*`,
`--radius-*`, `--bar-h`, `--control-h`, `--gutter`, `--z-*`,
`--error/--warn/--ok/--info` families). One changed line then moves
the whole app in step — the opposite of the drift the 2026-07-21
audits measured.

**`light-dark()` and `color-scheme`.** The base tokens are pairs:
`--fg: light-dark(#26261f, #e8e8e3)` picks a side from the active
`color-scheme`. A THEME is then just a `:root[data-theme='…']` block
that forces a scheme and overrides the family — see `sage-stone`,
`eucalyptus` (light) and `moss`, `biolum` (dark) in styles.css. The
renderer stamps `data-theme` from workspace settings (`THEMES` in
`renderer/src/workspace/model.ts`, unknown values read as `system`).

**`color-mix()` for glass.** `--glass-chrome: color-mix(in srgb,
var(--bg) 88%, transparent)` is an 88%-opaque tint of whatever the
theme's chrome color is — glass that re-tints itself per theme.

**`backdrop-filter`.** Real frosted glass (blur what is BEHIND the
element). It is GPU-expensive, and this dev machine renders all
software under WSLg (measured in the 07-15 perf audit) — which is why
the system budgets it: overlays only.

## The architecture concepts mobilized (named)

- **Token contract** — a new literal in chrome styling is a defect,
  not a choice (bedrock 36 invariant).
- **Two-surface doctrine** — `--bg` chrome vs `--surface` content,
  ladder ordered per scheme; the displayed tab fuses into the surface.
- **Budgeted identity** — the macOS-glass feel, spent where it is
  cheap (alpha tints on standing chrome) and rich where it is small
  (blurred popovers); opaque fallbacks via `@supports` and
  `prefers-reduced-transparency`.
- **Semantic color** — `.error` says `var(--error)`, never a hex; the
  audit found the same red drifted into three literals and one flat
  `#c0392b` unreadable on dark.
- **Same role, same box** — bars share `--bar-h`/`--gutter`, in-bar
  controls share `--control-h`: parity by construction, not by review.
- **Accessible name** — every icon-only button carries `aria-label` +
  `title`; a placeholder is not a name (12 inputs were unnamed).

## Walkthrough of the real code

`styles.css:root` holds four blocks in order: base palette +
`light-dark()` pairs, note-rendering tokens (`--note-*`, the content's
own family), semantic state colors, then the S07n scales and glass
tints. The theme blocks follow — compare `moss` (dark ladder: bg
`#171915` < surface `#20231d` < code-bg `#262a23`) with the base
comment's ladder rule.

The glass lives in three places: `body` paints the wash (a 6% accent
radial over `--bg`); `.app-header`, `.tabstrip`, `.pane-tree` wear
`var(--glass-chrome)` (alpha only — no filter); `.app-menu-panel` and
`.tree-menu` wear `var(--glass-pop)` + `backdrop-filter: blur(14px)`,
with the `@supports`/`prefers-reduced-transparency` fallbacks directly
below the tree-menu rule.

Controls: `.note-bar-actions button`, `.mode-switch button`, and the
`.note-bar-button` pill all sit in `--control-h` flex boxes — the
"three heights in one bar" audit finding, closed structurally. Icons
come from `renderer/src/icons.tsx` (16-viewBox, stroke 1.3,
`aria-hidden`) — 17 added in S07m, consumed via `.icon-button`, with
the shared `<HistoryNav>` (`renderer/src/HistoryNav.tsx`) as the
first extracted bar component.

## How it was built (methodology)

Audit first, system second: two parallel inspectors read all of
styles.css and every component (~175 findings, reports kept in the
session scratchpad), S07m executed the correctness wave (the
`.note-bar-button` scoping bug, the vestigial 2.6rem indent, dead CSS,
bar parity, semantic tokens, aria sweep), and only THEN did S07n name
the scales — extracted from measured usage, not invented. The owner's
tastes were interviewed, recorded in the ledger, and encoded as
bedrock 36's identity section; `AGENTS.md` gained the one line that
makes the doc load-bearing for every future session.

## Lessons learned the hard way

- **A scoping typo can un-style 18 buttons for weeks** — the pill
  class existed, but only under one ancestor; the web bar looked
  "alien" because its buttons were raw UA defaults.
- **Compensation rules outlive what they compensate** — the 2.6rem
  indent survived its dead toggle by four steps; every note bar sat
  indented vs the web bar.
- **Delete by exact boundaries** — a line-range deletion left one
  orphan `}`; the brace-count check (360/360) caught it before the
  build did.
- **Sentinels must not collide with prose** — a test asserting
  `not.toContain('old')` failed on "f**old**er".

## Try it yourself (exercises)

1. Add a fifth theme: copy the `moss` block, rename it, shift the
   accent hue, add the name to `THEMES` in `workspace/model.ts` — the
   picker, validation, and glass tints follow automatically. Check
   both ladders.
2. Break the contract on purpose: give any bar `padding-left: 13px`,
   then find it with `grep -n "13px" styles.css` — write the token
   spelling instead.
3. Open the app menu over a web tab, then the tree context menu —
   which one survives above the native view, and which guard makes
   that work? (Read the comments at the overlay acquire sites.)
4. Run the contrast floor: sample `--muted` on `--surface` in
   `biolum` with any checker — it must clear 4.5:1; if you retune the
   theme, re-check.
5. Set your OS to reduced transparency and relaunch — the glass must
   collapse to opaque without layout shift.

## Vocabulary you now own

```text
design token      a custom property with a contract, not just a variable
theme block       data-theme override of the token families, per scheme
surface ladder    the ordered chrome/code-bg/surface brightness rule
glass tint        color-mix alpha of a theme color — re-tints per theme
backdrop budget   blur only where the area is small (overlays)
semantic color    state families (--error/--warn/--ok/--info) over hexes
control box       --control-h flex box every in-bar control sits in
accessible name   what a screen reader announces — label, never glyph
```

## What arrives next

- The S07n feed in the CP-MVP-007 ledger: shared `.pill`/`.btn`/
  `.input`/`.popover` classes, `<NoteBar>`/`<InlineCreateForm>`/
  `<ConfirmDialog>`, editor-bar nav parity, TreeMenu overlay-guard
  registration, the full literal→token migration.
- CP-MVP-008's new AI surfaces (context menu, inline preview, chat
  column) are the design system's first born-conformant consumers.
