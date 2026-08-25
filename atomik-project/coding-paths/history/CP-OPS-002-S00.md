---
type: Atomik Coding Path History
title: CP-OPS-002 S00 — Adopt the local repairs — the four enforcement repairs, and how they landed
description: Completed-step record rolled out of CP-OPS-002.md at CP-OPS-002 S07c. Verbatim; nothing summarized.
tags: [coding-path, history, cp-ops-002]
timestamp: 2026-08-25T00:00:00Z
path: CP-OPS-002
step: S00
---

# CP-OPS-002 S00 — Adopt the local repairs — the four enforcement repairs, and how they landed

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

Entries in this record: S00, plus the four "Landed in S00" preambles and the status correction the third-party audit forced.

---

#### Landed in S00 — Restore the rebase gate in CI

Repaired directly at the owner's instruction before this path was opened. `resolveBranch()`
asks the host before the checkout; a new `branch-identity` rule fails closed when the
branch is undeterminable and guarded roots changed; `cairn.yml` checks out the pull
request HEAD sha so the gate judges the commit that lands rather than a merge preview
that contains the base by construction. Four regression tests.

#### Landed in S00 — Make the closing ceremony identifiable

Repaired with S01. Ceremonies are declared in frontmatter (`path:` + `ceremony: closing`)
and matched on exact path id; sixteen closure notes backfilled; three regression tests.
No grandfather set was added.

#### Landed in S00 — CI runs on path branches *(F8)*

Found after S01/S02: CI triggered on `push: master` and `pull_request` only, and every
path in this repository merges with a LOCAL merge commit — zero pull requests in history.
So no path-scoped rule had ever executed in CI. `push` now includes `'path/**'`, with a
`concurrency` group so a push-per-commit does not multiply runs.

#### Landed in S00 — `writes:` parsed from the frontmatter *(F9)*

The scan read the whole document, consumed `---` as a write surface, and refused the
trailing comment that the bedrock 24 template itself shows — so a path copied faithfully
from the template declared nothing and silently disabled `scope-drift`.

> **Status correction (third-party coherence audit, 2026-08-24).** An earlier version of
> this file marked S01/S02/S02b/S02c **DONE** and said they "landed on the trunk". Git
> disproves it: `HEAD` and `origin/master` are both `7aa3b1d` and every one of those
> changes is an uncommitted working-tree modification.
>
> Under Cairn's own completion definition — *"a step is not complete until its commit is
> online"* — the honest status is **implemented locally, uncommitted, not complete,
> awaiting adoption by the accepted path.**
>
> This is the most consequential incoherence the audit found, and it was in the execution
> plane rather than the documents: a path file claiming landed work that does not exist is
> exactly the failure the protocol is built to prevent, written by the audit that named it.
> The opening ceremony ratifies the set and the worktree adopts it; nothing is complete
> until then.

### S00 — Adopt the local repairs *(ruling 1)* — **COMPLETE**

The stash carried F1/F2/F8/F9 into this worktree and they land here, run through the
protocol they repair rather than around it. This is the first commit on a `path/*` branch
in this repository whose push will be seen by CI.

Contents: `resolveBranch()` + the fail-closed `branch-identity` rule (F1), frontmatter-based
`ceremonyFromSessions()` + 16 backfilled closure notes (F2), `push: path/**` with a
concurrency group and the PR-head checkout (F1/F8), frontmatter-scoped `parseWrites()` (F9),
the rule-table generator and its four guards, the audit record carrying F1–F15, the round-3
deliverables, and `index.html` restored behind a SUPERSEDED banner with `workflow.html`
byte-identical to master (ruling 4).

