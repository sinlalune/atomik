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
    - docs/modules/atomik-desktop-shell.md
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

### S01 — One proportional token, four consumers, and a test that sees the fifth — **COMPLETE**

```cairn-unit
step: S01
unit: 01
type: implementation
verified: cairn-check, typecheck, test, build
```

`--note-text-font` joins the `--note-*` block beside `--note-code-font`, and the
four proportional literals — `:root`, `.editor-host.live .cm-scroller`,
`.editor-host .lp-rich-limit`, `.cm-inline-ai-rendered` — become four consumers
of it. Nothing else changed: no tracking, no smoothing, no sizes.

- **The token is declared after its first use and that is fine.** `:root` reads
  `font-family: var(--note-text-font)` at line 3 while the definition sits at
  line 77 of the same rule. Custom properties resolve at computed-value time, not
  in source order, so declaration order within one rule does not matter. Verified
  in the engine rather than assumed: `getComputedStyle` on both
  `documentElement` and `body` returns the full new stack.
- **`note-typography.test.ts`, six assertions.** One definition; the stack order
  that makes Windows resolve Segoe UI Variable, including that plain `'Segoe UI'`
  stays *behind* the variable face; four consumers; no surviving literal of the
  old stack anywhere in the sheet; the three parity-critical selectors on the
  token; and no `letter-spacing` on `:root`. The fourth is the one that matters
  most — it is what makes a fifth copy fail rather than pass quietly.
- **The module note records the measurement**, including the four inert
  properties and the DejaVu finding, so the next person does not re-derive it
  and does not re-propose the dead CSS.

- **`writes:` widened, and the checker is why.** The declaration named only
  `docs/modules/atomik-desktop.md`. The `area-note` advisory pointed out that
  `styles.css` maps to the **shell** area, whose note had not changed — and the
  root note states the split outright: it keeps what is cross-cutting, the area
  note keeps what the area owns. The typography section therefore belongs in
  `atomik-desktop-shell.md` and moved there; only the one-line *Common mistakes*
  entry stays in the root note, which is a section the split assigns to it.
  `docs/modules/atomik-desktop-shell.md` is added to `writes:` in this same work
  unit, per the drift rule.
- **`single-truth` on the root note is deliberate.** It fires because that note
  is shared across areas. The edit is one bullet in *Common mistakes*, which the
  documented split assigns to the root note specifically; the area-owned detail
  is not there.

Environment note, not a code finding: this worktree needed
`apps/desktop/node_modules` copied from a sibling. The main checkout's copy has
an empty `vitest/` directory, so a symlink to it typechecks as
`TS2307 Cannot find module 'vitest'` across every test file. Worth knowing before
diagnosing it as a tsconfig problem.

## Documentation coverage

**Required:** `docs/bedrock/36_36-ui-design-system.md` (chrome token contract —
governs, not written), `docs/modules/atomik-desktop.md`.
**Deliberately excluded:** `letter-spacing`, the four inert rendering properties,
note heading tracking, the `--fs-*` scale, bundling a font file, dark-mode
colour, and the remaining monospace literals.

## Work Ledger

S01 is the path's only planned step and is complete; the ledger above carries it.

## Current checkpoint

S01 on `path/cp-ui-typography`, rebased onto trunk `39127e7`.

## Next action

Closing ceremony, then the coherence audit and self-merge.

## Blockers

None.
