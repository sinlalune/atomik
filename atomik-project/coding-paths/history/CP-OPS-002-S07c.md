---
type: Atomik Coding Path History
title: 'CP-OPS-002 S07c — Redo: one handbook, universal, in its own theme (owner correction) — SUPERSEDED by S07e'
description: Completed-step record rolled out of CP-OPS-002.md at CP-OPS-002 S07g. Verbatim; nothing summarized.
tags: [coding-path, history, cp-ops-002]
timestamp: 2026-08-26T00:00:00Z
path: CP-OPS-002
step: S07c
---

# CP-OPS-002 S07c — Redo: one handbook, universal, in its own theme (owner correction) — SUPERSEDED by S07e

Rolled out of [CP-OPS-002.md](../CP-OPS-002.md) at CP-OPS-002 S07g, VERBATIM:
moved, never summarized. The live path file keeps its declaration, its index over
these records, its Work Ledger and its next action; the execution detail lives
here. The convention is in [paths.md](../paths.md#the-ledger-has-a-boundary).

Two mechanical adjustments were unavoidable and are named rather than made
silently. **Deixis**: text saying "below", "this ledger" or "the checkpoint" was
written when this entry sat in the path file and points at the Work Ledger in
[CP-OPS-002.md](../CP-OPS-002.md); repairing it in place would have made the
record no longer verbatim. **Link depth**: a relative link is an address, not
content — moving the file one directory down changes the address of the *same*
target, so `../sessions/…` became `../../sessions/…`. The characters differ; the
reference does not.

---

### S07c — Redo: one handbook, universal, in its own theme *(owner correction)* — **SUPERSEDED by S07e**

`foundations.md`, `specification.md`, `lexicon.md` and `foundations.html` are deleted and
replaced by **`docs/cairn/handbook.md`** and **`docs/cairn/handbook.html`**.

- **One document, two modes, alternating.** Each part is a `CONCEPT` block — a piece of general
  software practice explained from nothing, true of any project — immediately followed by an
  `IN CAIRN` block giving this protocol's implementation, the enforcing file, and the failure
  that made it necessary. The alternation is stated as a reading contract at the top: read
  straight through for both, or read only the `IN CAIRN` blocks, which are self-contained and
  carry **every** normative statement. That is what made merging the specification into the
  teaching safe — the normative layer stays extractable rather than dissolving into prose.
- **Universal, with the analogies removed rather than replaced.** Every research-world concept
  is gone. Nothing takes their place: the explanations now stand on concrete software
  situations, the actual failures, and diagrams. Substituting a different profession's
  analogies would have reproduced the defect with a different dependency — the fix is for the
  text to require no outside vocabulary at all.
- **The repository's own failures do the teaching**, and they are the one thing the redo kept
  intact: the automation that never ran on the branches its rules were about, the ceremony gate
  that proved a path had been *opened* while claiming it had been *closed*, the piped gate that
  shipped a broken build, the derived view that was internally current and globally false, the
  34 links that were not broken. They are evidence, they are dated, and they belong to this
  repository rather than to any reader's background.
- **Exhaustive.** Twelve parts: what a project is · version control · tests · automation and
  gates · working in parallel · the protocol layer · the lifecycle · the operator guide · this
  repository's declared properties · the known limits · the reference (generated rule catalogue
  + full lexicon) · the skippable tier-2 ruleset.
- **A new theme, built for this document.** Sans throughout, one accent, hairline rules, sticky
  contents column, and a design whose primary job is making the two modes legible at a glance —
  `CONCEPT` on the page ground, `IN CAIRN` in an accented panel. Four inline SVG diagrams
  replace ASCII where a picture carries more: the commit chain and hash propagation, branch
  divergence, the three enforcement states, and the lifecycle machine. Plus a fifth for the
  parallel-paths flow — registration commits on the trunk, three paths running at once, each
  merging itself. Theme-aware in light and dark, structure parser-validated.
- **The generator follows the file.** `SPEC_FILE` now points at `handbook.md`, so the test that
  compares the shipped rule catalogue against the validator's source still runs on every CI run.
  The HTML renders that catalogue as 18 unique rules with a footnote for the three that carry
  both a blocking and an advisory form, and states plainly that the Markdown is the
  authoritative copy — a rendered table that claimed to be generated would be the exact defect
  this document is about.
- Suite 83/83, unchanged: the redo is documentation and one constant.
