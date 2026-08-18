---
type: Atomik Coherence Audit
title: Coherence audit — CP-RICH-MARKDOWN @ 9885ab3
timestamp: 2026-08-18T16:16:01.521Z
atomik:
  path: CP-RICH-MARKDOWN
  branch: path/cp-rich-markdown
  head: 9885ab3089b99f6b03903033429c1f629d63f1a4
  base: 98561b4
  verdict: drift noted, proceeding
---

# Coherence audit — CP-RICH-MARKDOWN @ 9885ab3

Run after the rebase, before the merge. ADVISORY: nothing here blocks. Its job
is to catch what no deterministic check can — two paths that each pass every
rule and still pull the architecture in different directions.

## What to read

- the rebased diff for this branch
- every bedrock page and ADR named in this path's documentation coverage
- the module area notes the diff touches
- any OTHER path currently `running` that declares an overlapping surface

## Findings

### Does the diff contradict an accepted decision?

No contradiction found; two deliberate corrections of earlier behaviour, both
documented.

- **13 (Electron security) is respected, not bent.** Vega could not run under
  `script-src 'self'` because it compiles expressions with `Function(...)`. The
  CSP was NOT relaxed: the spec is parsed to an AST and evaluated with
  `vega-interpreter`. The tempting fix here was the one that would have
  contradicted an accepted decision, and it was refused.
- **S05o's source-true read spacing now also governs LIVE.** Read has mirrored
  the author's blank lines since S05o; live carried a fixed `padding-block`
  that invented a gap. This EXTENDS the accepted decision rather than reversing
  it, and the definition of done already demanded read/live parity.
- **Editor dark-ness changed for four themes.** `EditorPane` counted only
  `dark`, so `moss`, `biolum`, `ember` and `hearth` kept CodeMirror's light
  theme. Correcting it changes the editor's appearance in those themes — a
  visible change to behaviour that predates this path. It was owner-reported
  and owner-accepted at the bench, and `styles.css` was always the authority.
- `vega-interpreter` 2.3.2 (BSD-3-Clause) is recorded in ADR-014's dependency
  pin with its reason.

### Does it duplicate something another running path is building?

No. `ACTIVE.md` lists CP-RICH-MARKDOWN as the only `running` path at this head;
CP-MVP-011 is "next up" and opens after its predecessor merges, so no other
branch declares an overlapping surface.

The duplication in this path was INTERNAL, and it was the story of its bench:
six defects, every one a second definition of something that already existed —
two adapters re-reading CSS the engine resolves, three definitions of
dark-ness, a second clipboard, and live inventing its own block spacing. The
audit's own question is aimed across paths; this path's lesson is that the same
question is worth asking WITHIN one.

### Did it introduce architecture that belongs in an ADR and has none?

Covered, with one item worth watching.

- The renderer registry, adapter security pins, budgets and the environment
  rules (colour resolution, CSP/AST, one definition of dark-ness) are all in
  ADR-014, §8 added by S07.
- **Watch item:** the real-Electron lane (`smoke:rich`) and the repeatable
  bench (`bench:rich`) are currently described as renderer-specific, in
  ADR-014 §8 and the shell/editor module notes. If a second path adopts the
  pattern — a lane that drives the real app because the unit environment cannot
  see a class of truth — that is a general testing-architecture decision and
  should earn its own ADR rather than being inherited by imitation from this
  one. It is not yet load-bearing for anyone else, so no ADR is written now.

### Is anything now documented in two places that will drift apart?

Three, ranked by how much the repair costs if they drift.

1. **Dark theme names** — `styles.css` declares `color-scheme`, `theme.ts`
   mirrors the set for engine-less environments. MITIGATED: the
   `dark-themes-match-stylesheet` test parses the stylesheet and fails on
   drift. This is the model the other two should follow.
2. **Renderer limits** — the numbers live in `DEFAULT_RICH_LIMITS`, are
   restated in ADR-014 §6, and CP-AI-CAPABILITIES intends to restate them
   again in a prompt block telling the model what it may emit. THREE copies of
   the same integers, one of which will be read by a model and believed. That
   path already plans a drift test pinning the block against
   `DEFAULT_RICH_LIMITS`; it should be treated as required, not optional.
3. **Bench numbers** — first/repeat render and the S01 medians appear in the
   S07 session note, the ledger checkpoint and the editor module note. These
   are DATED SNAPSHOTS rather than live claims, which is the honest form, but
   the module note is the one that reads as current and will age worst. The
   `bench:rich` ceiling is the executable version and should be trusted over
   any prose copy.

## Verdict

**drift noted, proceeding.**

Nothing here should stop the merge. The architecture the path introduces is
recorded, the one decision it could have contradicted (the CSP) it explicitly
refused to bend, and the only concurrent-path question is moot at this head.

The drift worth carrying forward is item 2: the renderer limits are about to
exist in a third place, inside a prompt, where a wrong number does not fail a
build — it quietly teaches a model to write charts that get refused. The next
path should close that with a test before it ships the text.

One honest note on this audit's own value, since `paths.md` asks whether the
coherence audit finds anything a human would not. Here it did not. Every
finding above was already known from the bench or the fixes. What found the
real problems was running the app.
