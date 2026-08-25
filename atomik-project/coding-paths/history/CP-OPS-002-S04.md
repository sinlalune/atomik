---
type: Atomik Coding Path History
title: CP-OPS-002 S04 — Bound the ledger — the history/ rollup convention and advisory ledger-size
description: Completed-step record rolled out of CP-OPS-002.md at CP-OPS-002 S07c. Verbatim; nothing summarized.
tags: [coding-path, history, cp-ops-002]
timestamp: 2026-08-25T00:00:00Z
path: CP-OPS-002
step: S04
---

# CP-OPS-002 S04 — Bound the ledger — the history/ rollup convention and advisory ledger-size

Rolled out of [CP-OPS-002.md](../CP-OPS-002.md) at CP-OPS-002 S07c, VERBATIM:
moved, never summarized. The live path file keeps its declaration, its index over
these records, its Work Ledger and its next action; the execution detail lives
here. The convention is in [paths.md](../paths.md#the-ledger-has-a-boundary).

Two mechanical adjustments were unavoidable and are named rather than made
silently. **Deixis**: text saying "below", "this ledger" or "the checkpoint" was
written when these entries sat in the path file and points at the Work Ledger in
[CP-OPS-002.md](../CP-OPS-002.md); repairing it in place would have made the
record no longer verbatim. **Link depth**: a relative link is an address, not
content — moving the file one directory down changes the address of the *same*
target, so `../sessions/…` became `../../sessions/…`. The characters differ; the
reference does not. Leaving them would have preserved the characters and broken
the reference, which is the opposite of faithful.

Entries in this record: S04.

---

### S04 — Bound the ledger *(F4, medium — advisory)* — **COMPLETE**

`log.md` was frozen so parallel paths stop colliding on one file, not for context cost —
that succeeded. Separately, the live path corpus (~85 k tokens) had no upper bound and a
single path file exceeded 23 k. Not a defect; a boundary set before it was hit.

- **The convention** is in `paths.md` § *The ledger has a boundary*: completed steps roll
  into `atomik-project/coding-paths/history/<id>-S0N.md`, one file per major step with
  sub-steps beside the step they belong to. The path file keeps its declaration, a one-line
  index per step, the Work Ledger, the next action and blockers.
- **The move is VERBATIM** — cut and paste, never summarize. Summarizing at rollup time
  would quietly rewrite the record, which is the one thing a ledger may not do. It is the
  property that makes rolling safe, so it is stated in the convention, in the index, and in
  the header of every record.
- **`CP-MVP-008` migrated as the proof**: ~23.5 k tokens to ~4.7 k, seven step records
  under `history/`. Verified line-for-line — the 1,621 non-empty lines of its Execution
  section are byte-identical to what the records now hold.
- **`ledger-size`** is advisory and DIFF-SCOPED, over a 10,000-token budget: a path file
  should not cost more than the entire mandatory entry chain (~9.3 k). A corpus sweep would
  report the same four historical files on every run for months, and a check that cries
  wolf is a check people switch off. Four tests, including one pinning `approxTokens()` to
  the same words × 4/3 proxy the F4 table used, so a finding and the audit record are
  comparable numbers.
- Bedrock is untouched on purpose: `AGENTS.md` says bedrock states the doctrine while
  `paths.md` carries the operating detail and may change without amending a bedrock page.
  A ledger rotation convention is operating detail.
- Round 3's register row C7 said `ledger-size` did not exist in code. True when written,
  false now — the row is corrected and §2.3's rule table regenerated from the live source.

