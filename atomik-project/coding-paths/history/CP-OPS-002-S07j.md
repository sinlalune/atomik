---
type: Atomik Coding Path History
title: 'CP-OPS-002 S07j — The v0.2 predicates, part three: routes, the brief contract, redaction — COMPLETE'
description: Completed-step record rolled out of CP-OPS-002.md at CP-OPS-002 S07m. Verbatim; nothing summarized.
tags: [coding-path, history, cp-ops-002]
timestamp: 2026-08-26T00:00:00Z
path: CP-OPS-002
step: S07j
---

# CP-OPS-002 S07j — The v0.2 predicates, part three: routes, the brief contract, redaction — COMPLETE

Rolled out of [CP-OPS-002.md](../CP-OPS-002.md) at CP-OPS-002 S07m, VERBATIM:
moved, never summarized. The live path file keeps its declaration, its index over
these records, its Work Ledger and its next action; the execution detail lives
here. The convention is in [paths.md](../paths.md#the-ledger-has-a-boundary).

Two mechanical adjustments are named rather than made silently. **Deixis**: text
saying "below" or "this ledger" was written when this entry sat in the path file
and points at the Work Ledger in [CP-OPS-002.md](../CP-OPS-002.md). **Link
depth**: a relative link is an address, not content — moving the file one
directory down changes the address of the *same* target.

---

### S07j — The v0.2 predicates, part three: routes, the brief contract, redaction — **COMPLETE**

```cairn-unit
step: S07j
unit: 05
type: implementation
verified: cairn-check, cairn-check:test, typecheck, test, build
```

The adoption group, and the last of the fourteen rows that could be reached at all.

- **`route` (blocking).** Vocabulary (`lightweight | full | foundation`), plus the three
  full-route triggers that are structural and therefore checkable: the change touches the
  control plane, it touches architecture or a decision record, or its `writes:` covers more
  than one implemented area. The other two triggers in the specification — *expected to
  span more than one work unit* and *policy-designated high-risk* — are an expectation and
  a policy, so they stay declared rather than derived, and the matrix says so instead of
  implying the list is exhaustive. A `foundation` route's write surface is confined to
  documents and the path records it produces. Descent from `full` blocks: escalation is
  one-way, because a change does not become small by being called small.
- **`brief-schema` (blocking).** The eight frontmatter fields, the seven capped sections
  and nothing outside them, `governs` entries pinned, `checkpoint_pushed` true, and the
  declared token budget. What is **not** claimed is the answerable-alone contract: whether
  a brief can actually be resumed cold is a judgement and a benchmark, and the shape is all
  a checker can see.
- **`redaction` (blocking).** Every `[redacted: <id>]` marker must name a redaction record
  that exists. A marker pointing at nothing is an edit wearing a ceremony's clothes.
- **A live parser bug, found by the new rules and fixed rather than worked around.** The
  scalar reader took values verbatim to end of line, which was a deliberate documented
  choice — and it meant `governs:   # declared READ surface` produced a **non-empty** value,
  so the key stopped opening its list and this path silently declared no governing
  documents at all. That is exactly the F9 failure, one line higher up: the same trap the
  list-item reader was already taught to avoid. Scalars now strip a trailing comment, a
  whole-comment value reads as empty, and a quoted value keeps its `#` because there it is
  content. The test that pinned the old behaviour was rewritten to pin the new, with the
  reason recorded — it documented a limitation, not a requirement.
- **This path migrated onto the rules.** It declares `route: full` (control plane and
  decision plane, so the triggers demand it), and its handoff brief was rewritten onto the
  seven-section contract inside the 1200-token budget. The old brief failed the gate on
  nine counts, which is a fair measure of how much a bootstrap contract drifts when nothing
  is checking it.
- **The redaction rule cried wolf twice before it was right**, both times on documentation
  describing itself: first on the ledger entry above, then on its own generated catalogue
  row. Code spans and fences are now stripped before any marker is judged — the same lesson
  the link rule learned against 34 false positives — and the catalogue text quotes its
  example. A rule that flags its own specification is a rule people switch off.
- **The lifecycle table was reconciled with the specification in the same step**, closing
  the one v0.2 row that had been corrected in prose and left untouched in code:
  `ready → blocked` now exists (acceptance stalls), `blocked → ready` still does not
  (reaching `ready` is execution), an unchanged state is accepted for every state, and an
  archived resolution is terminal. Doing so exposed a pre-existing defect — an unchanged
  `done → archived (completed)` record failed the "unintegrated paths archive as abandoned
  or superseded" rule on every later run, because an unchanged state was being read as an
  archiving event. Fixed with the reason recorded rather than the symptom silenced.
- Fifteen regression tests; checker suite 110 → 125, full suite 157 → 172.
