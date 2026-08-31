---
type: Atomik Session Record
title: CP-UI-TYPOGRAPHY closing ceremony — one proportional face, defined once
timestamp: 2026-08-27T00:00:00Z
tags: [closing-ceremony, ui, typography, design-system, dogfooding]
path: CP-UI-TYPOGRAPHY
branch: path/cp-ui-typography
ceremony: closing
---

# CP-UI-TYPOGRAPHY closing ceremony

Run with the owner on 2026-08-27. The path opened from one sentence of feedback
on the Cairn reader built in CP-OPS-002 —

> "i LOVE this font can we use the same in atomik ?"

— and closes one work unit later, having changed less than the request implied
and more than `:root`.

## The exact candidate

```text
candidate     817086e2645875515fa6e666af87449a051d9fde
base          df875e68c383f6e82b833b755e8925f2fb4651ed
branch        path/cp-ui-typography
retention     refs/cairn/checkpoints/cp-ui-typography/01 -> 817086e
contains      origin/master (39127e7) — the rebase gate is satisfied at this head
route         lightweight — one work unit, one implemented area, no control
              plane and no architecture change
```

Six files, +287 / −12: the stylesheet, its new test, the shell module note, one
line of the root module note, the path record and the brief.

## What was accepted

`--note-text-font` is defined once in the `--note-*` block, beside the
`--note-code-font` that was already there, and four rules consume it:

| Site | Why it declares a face at all |
| :-- | :-- |
| `:root` | the document default every chrome and content surface inherits |
| `.editor-host.live .cm-scroller` | escapes the monospace source mode sets |
| `.editor-host .lp-rich-limit` | a notice label rendered inside the live editor |
| `.cm-inline-ai-rendered` | escapes the monospace of the scroller it sits inside |

Those four previously wrote the same stack out in full. That was the defect, and
it is the reason the accepted scope is not what was first proposed.

## What survived challenge

- **`:root` alone was rejected.** It would have moved rendered notes to the new
  face and left the live editor on the old one, breaking the invariant the
  stylesheet states in its own words — *read <-> live never shifts the text*.
- **`font-family: inherit` was rejected** as the deduplication mechanism. It is
  correct at `.cm-scroller` and wrong at `.cm-inline-ai-rendered`, whose parent
  IS the monospace scroller; the comment there records the bug that produced
  (S05f — bold and italic vanishing under WSLg).
- **A new *chrome* token was rejected.** It would extend the vocabulary
  `docs/bedrock/36_36-ui-design-system.md` enumerates, making this an
  architecture change and forcing `route: full`. That page delegates content
  typography to the `--note-*` family, so a `--note-*` token needs no amendment.
- **Four rendering properties were dropped as dead CSS.** Rendered pixels are
  byte-identical with and without each: the smoothing pair is macOS-only,
  `font-optical-sizing: auto` is the CSS initial value, and
  `text-rendering: optimizeLegibility` only forces on what Chromium already does.
- **`letter-spacing` was dropped.** It is the only property measured to change
  anything — advance width 555.063 → 552.141 px over 65 characters, which
  re-wraps existing notes — and it lands on the content side of a line bedrock 36
  draws deliberately.

## What the review caught, recorded because it changed the outcome

Both defects were in the opening check, and both were mine.

1. **"the only `font-family` declaration" was false.** It is one of four. The
   claim came from a `grep … | head -40` whose truncation hid the rest, written
   down as a measured fact — the failure bedrock 24 §Gates names explicitly and
   this repository has already paid for once.
2. **"five rendering properties produce the look" was false.** The owner chose
   scope on that claim. Four of the five do nothing, and the fifth does the one
   thing the same note promised would not happen.

The registration was amended and force-pushed before the merge of PR #1, so the
trunk carries the corrected record rather than the original one.

## Verification at this head

```text
npm run cairn-check    OK — 1 advisory (coherence audit, run after this note)
npm test               1107 passed | 1 skipped, 79 files
npm run typecheck      pass
npm run build          pass
```

`note-typography.test.ts` carries six assertions. The load-bearing one is that
**no literal of the old stack survives anywhere in the sheet** — it is what makes
a fifth copy fail rather than pass quietly. The stack-order assertion is second:
plain `'Segoe UI'` must stay behind `'Segoe UI Variable Text'`, or the change
silently reverts on the only platform it is visible on.

## Known limits, stated rather than buried

- **On Linux this changes no pixels.** Every proportional stack in play, old and
  new, resolves to DejaVu Sans on a host without Inter — read with CDP
  `CSS.getPlatformFontsForNode`, not inferred. The visible effect is Windows 11
  only, where the new order resolves Segoe UI Variable. What Linux gains is the
  single definition.
- **The monospace literals are untouched.** `--note-code-font` single-sources the
  note-code face, but other monospace declarations still restate their stack.
  Same class of duplication, deliberately out of scope, not claimed as fixed.
- **`writes:` was widened mid-unit** to add `docs/modules/atomik-desktop-shell.md`
  after the `area-note` advisory showed the documentation had gone to the root
  note when the area owns it. Recorded in the ledger, per the drift rule.
- **`single-truth` stays advisory on the root module note.** The edit there is one
  *Common mistakes* line, a section the documented split assigns to the root note.

## Roadmap

Nothing follows from this path. Deliberately excluded and still open, each its
own judgement: note heading tracking, the `--fs-*` chrome scale, bundling Inter
as a local asset to remove the per-OS split, and the remaining monospace
duplication.

CP-OPS-002 rebases onto this merge at its next step boundary. Its S08 renames
`atomik-project/` to `project/`, which will move this path's record and brief;
closing first is what keeps that a rename of history rather than a collision.

## Acceptance

Owner accepted the candidate above for integration.
