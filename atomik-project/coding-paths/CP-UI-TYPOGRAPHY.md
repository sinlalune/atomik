---
type: Atomik Coding Path
title: Reader typography in the app — the stack, and the five settings that actually do the work
description: Adopts the Cairn reader's font stack and its five rendering properties in the Atomik renderer's :root, measured rather than assumed, with a test pinning both.
tags: [coding-path, ui, typography, design-system, dogfooding]
timestamp: 2026-08-27T00:00:00Z
atomik:
  id: CP-UI-TYPOGRAPHY
  route: lightweight
  status: running
  accepted: 2026-08-27
  base_commit: df875e6
  branch: path/cp-ui-typography
  writes:                    # ADVISORY — a signal, never a lock
    - apps/desktop/renderer/src/styles.css
    - apps/desktop/tests/**
    - docs/modules/atomik-desktop.md
    - atomik-project/coding-paths/CP-UI-TYPOGRAPHY.md
    - atomik-project/briefs/cp-ui-typography-handoff.md
  governs:
    - docs/bedrock/36_36-ui-design-system.md@ce97f012630db0c45bda7a62b40b6019e3670b33
---

# CP-UI-TYPOGRAPHY

> **ACTIVATED 2026-08-27** on owner feedback during CP-OPS-002 review
> ([opening check](../sessions/2026-08-27-cp-ui-typography-opening-check.md)).
> Registered at `base_commit: df875e6` before its worktree branched.
> Scope revised the same day after PR review; the opening check records both
> corrections and the measurements that forced them.

## Why this path exists

The owner reviewed the Cairn reader built in CP-OPS-002 and asked for its
typography in the app. Two rounds of measurement narrowed what that means.

The proportional font stack is written out **four** times in
`apps/desktop/renderer/src/styles.css` — at `:root`, at the live editor, at a
live-preview notice, and at the inline AI widget. The file's own `--note-*` block
forbids exactly this ("both consume THESE, never their own copies … so read <->
live stays a seamless transition by construction"), and the comment at line 2444
states the invariant the duplication endangers: *read <-> live never shifts the
text.* Changing `:root` alone would have moved rendered notes and left the live
editor behind.

The five rendering properties the first draft proposed do not survive
measurement: four are byte-identical in rendered pixels (macOS-only smoothing, a
property whose accepted value is already the CSS initial value, and one Chromium
already applies), and `letter-spacing` is the only one that changes anything —
metrics, by ~0.5%, re-wrapping existing notes, on the content side of a line
`docs/bedrock/36_36-ui-design-system.md` draws deliberately.

So the change is one thing: **the family, defined once, consumed four times.**
On Windows that moves every proportional surface from Segoe UI to Segoe UI
Variable together. On Linux it changes no pixels — every stack in play already
resolves to DejaVu Sans — and removes a standing duplication instead.

## Steps

### S01 — One proportional token, four consumers, and a test that sees the fifth

Add `--note-text-font` beside the existing `--note-code-font`, point all four
sites at it, pin both the token and the absence of any surviving stack literal in
a test, and record the measurement in the module note.

## Documentation coverage

**Required:** `docs/bedrock/36_36-ui-design-system.md` (chrome token contract —
governs, not written), `docs/modules/atomik-desktop.md`.
**Deliberately excluded:** `letter-spacing`, the four inert rendering properties,
note heading tracking, the `--fs-*` scale, bundling a font file, dark-mode
colour, and the remaining monospace literals.

## Work Ledger

_No work unit executed yet. S01 is the next action._

## Current checkpoint

Registered on the trunk at `df875e6`; no implementation branch yet.

## Next action

Create the worktree from the registration commit and execute S01.

## Blockers

None.
