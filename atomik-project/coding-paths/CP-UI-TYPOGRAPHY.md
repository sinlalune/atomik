---
type: Atomik Coding Path
title: Reader typography in the app — the stack, and the five settings that actually do the work
description: Adopts the Cairn reader's font stack and its five rendering properties in the Atomik renderer's :root, measured rather than assumed, with a test pinning both.
tags: [coding-path, ui, typography, design-system, dogfooding]
timestamp: 2026-08-27T00:00:00Z
atomik:
  id: CP-UI-TYPOGRAPHY
  route: full            # escalated at S03; see the ledger
  status: done
  accepted: 2026-08-27
  subject_commit: a380f2ad1d03f3f5c3fe6629875f8dc55c704018
  base_commit: df875e6
  branch: path/cp-ui-typography
  writes:                    # ADVISORY — a signal, never a lock
    - apps/desktop/renderer/src/styles.css
    - apps/desktop/renderer/src/fonts/**
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

### S02 — Bundle the face, because Electron is here for universality — **COMPLETE**

```cairn-unit
step: S02
unit: 02
type: implementation
verified: cairn-check, typecheck, test, build
```

Owner ruling, and the sharpest correction of this path:

> "we are building electron for the OS universality capability and you
> implemented an os specific feature/design ?"

Correct, and S01 was worse than it looked. The stack it shipped was neither of
the two coherent strategies. **Native per OS** — what the app already did — is
universal by adaptation: every platform supplies its own UI font. **One bundled
face** is universal by control. S01 was native-per-OS with a Windows-only name
wedged in front: an OS-specific improvement in an app chosen for not being
OS-specific.

The tell was available the whole time and I kept filing it as a footnote: the
change is invisible in `npm run dev` on WSL2. A design decision the developer
cannot observe on their own machine cannot be reviewed there, and this one
survived a PR review, a ceremony draft and four gate runs precisely because
nobody could see it.

- **Inter v4.1 ships in `apps/desktop/renderer/src/fonts/`** under the SIL OFL,
  with `LICENSE-Inter.txt` beside it. Two `@font-face` rules; the bundler emits
  both files to `out/renderer/assets/`, verified in the build output.
- **Both roman and italic.** The variable roman covers 100–900 so bold is drawn,
  not synthesised — but it carries no italics, and synthetic oblique on markdown
  `em` is the defect class S05f already recorded. 352 KB + 388 KB.
- **`font-display: block`**, because a flash of fallback text re-wraps a note
  mid-read.
- **The token leads with `Inter` and keeps `system-ui` behind it** as a
  fallback for a failed font load, never as the expected outcome. Every
  OS-specific family name is gone.
- **Verified in the engine, not in `fc-match`.** CDP
  `CSS.getPlatformFontsForNode` reports `Inter Variable`, flagged custom, for
  normal, bold and italic. `fc-match` cannot see a font the app loads itself and
  would have said DejaVu — worth knowing before trusting it again.
- **The test grew to eight.** New: Inter is first; no OS-specific name appears at
  all; both files exist and begin with the `wOF2` magic, so a placeholder or an
  LFS pointer fails; two `@font-face` rules with the full weight axis and a real
  italic file. `writes:` gains `apps/desktop/renderer/src/fonts/**`, recorded
  here per the drift rule.

A finding that is now moot but was true: `'Segoe UI Variable Text'` is a
Windows-only family name. DirectWrite exposes the optical-size instances as
separate families; fontconfig sees one family, `Segoe UI Variable`. The S01 stack
could therefore never have matched off Windows, even with the file present.

### S03 — Escalate the route, before closing under a false one — **COMPLETE**

```cairn-unit
step: S03
unit: 03
type: documentation
verified: cairn-check, typecheck, test, build
```

The path opened `route: lightweight` on an honest expectation: one work unit,
one area, six lines of CSS. It has now run three, and the second was a design
reversal rather than an extension.

Under the v0.2 route rules being written next door in CP-OPS-002, that is trigger
4 — *expected to span more than one work unit* — with the structural backstop
that catches it after the fact: **a path whose ledger declares more than one
`cairn-unit` MUST declare `route: full`.** Escalation is one-way and may not be
declared away.

The trunk's checker has no route concept yet, so nothing here was enforced and
nothing would have failed. That is exactly why it is worth doing: the rule exists
because self-declared smallness is the obvious bypass, and a path that quietly
kept `lightweight` after reversing its own design would be the first example of
the bypass in this repository — recorded by the same session that wrote the rule.

The full route's artifacts were already being produced: a standalone opening
record, a standalone closing record, and a coherence audit bound to the exact
candidate. What changes is the declaration matching them.

## Documentation coverage

**Required:** `docs/bedrock/36_36-ui-design-system.md` (chrome token contract —
governs, not written), `docs/modules/atomik-desktop.md`.
**Deliberately excluded:** `letter-spacing`, the four inert rendering properties,
note heading tracking, the `--fs-*` scale, bundling a font file, dark-mode
colour, and the remaining monospace literals.

## Work Ledger

S01, S02 and S03 are complete; the ledger above carries all three. S02 was not planned —
it is the owner's correction of S01's design, not an extension of it.

## Current checkpoint

S03 on `path/cp-ui-typography`, based on trunk `39127e7`.

## Next action

None — the path is closed. Closing ceremony recorded
([session note](../sessions/2026-08-27-cp-ui-typography-closing-ceremony.md)),
coherence audit filled at the exact candidate
([audit](../audits/cp-ui-typography-a380f2a.md), verdict *drift noted,
proceeding*), and the candidate is proposed for integration.

## Blockers

None.
