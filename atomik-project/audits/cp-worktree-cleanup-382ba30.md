---
type: Atomik Coherence Audit
title: Coherence audit — CP-WORKTREE-CLEANUP @ 382ba30
timestamp: 2026-08-24T10:03:56.706Z
atomik:
  path: CP-WORKTREE-CLEANUP
  branch: path/cp-worktree-cleanup
  head: 382ba3098b55bcb66e186888ee8b84439e851634
  base: 41d661b
  verdict: clean
---

# Coherence audit — CP-WORKTREE-CLEANUP @ 382ba30

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

No. The diff implements ADR-012 decision 9 and preserves decision 8's remote
checkpoint/session boundary. Cleanup begins only after the merge reaches the
remote trunk; it never rewrites the meaning of `done`, forces a dirty checkout
away, or treats branch history as disposable.

### Does it duplicate something another running path is building?

No. CP-MVP-011 and CP-MVP-012 build Wikimedia product behavior and do not
implement post-merge Git cleanup. Their broad `docs/learning/**`, session,
audit, log, and coding-path-index declarations overlap only at directory or
portfolio-view level. This path owns distinct per-entry files and one explicit
process row; no product source or same durable decision is duplicated.

### Did it introduce architecture that belongs in an ADR and has none?

No unrecorded architecture. The lifecycle decision is recorded as ADR-012
decision 9 in the same work unit. No product runtime, hook, daemon, scheduler,
or new service was introduced.

### Is anything now documented in two places that will drift apart?

The rule is intentionally projected into AGENTS, paths.md, bedrock 22/24/35,
ADR-012, the learning note, Cairn guide, D08 and D14. Their order and safety
boundaries agree: remote proof, exact target, clean status, non-forced removal,
absence proof, retained branch. The diagram register records the refresh.
D13 remains current because it is the close-up of registration, concurrent
ownership, and merge mechanics; the new machine-local transition starts after
that merge and belongs in the full-lifecycle D14.

## Verdict

clean

*(clean · drift noted, proceeding · needs a conversation before merge)*
