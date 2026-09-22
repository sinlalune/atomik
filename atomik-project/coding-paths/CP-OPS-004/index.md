---
type: Atomik Coding Path
title: The trunk judges itself — repair the base a push to master is compared against
description: The kept workflow compares a push to the trunk with origin/master, which after the push already names the pushed commit. Every changed-file rule is narrowed to nothing and the run is inconclusive. CP-OPS-003 claimed this outcome without ever seeing a green trunk run.
tags: [cairn, ops, ci, comparison, repair]
timestamp: 2026-09-22T00:00:00Z
atomik:
  id: CP-OPS-004
  route: full            # control plane; escalation is one-way
  status: done
  current_step: S01
  base_commit: 3ab967061124249cebe74c920cc9380d61d39952
  branch: path/cp-ops-004
  assigned_writer: jubette
  depends_on: []
  subject_commit: 98ba9bbe692724e9a2ccb3ca4e68ecbb81a1b267
  resolution: completed
  writes:
    - .github/workflows/cairn.yml
    - atomik-project/coding-paths/CP-OPS-004/**
    - atomik-project/coding-paths/ACTIVE.md
    - atomik-project/log/**
  governs:
    - .github/workflows/cairn.yml@267a7009482315068d390eb7a816c98c2f98015e
    - atomik-project/coding-paths/CP-OPS-003/index.md@212a37ec51b89aaaf9e4aa6a6e84f93a6decbe9e
---

# CP-OPS-004 — the trunk judges itself

## Goal

A push to `master` is compared against `origin/master`, which after the push
already names the pushed commit, so the comparison is empty, every changed-file
rule narrows to the working tree, and `comparison` reports the run
inconclusive. The trunk has been red since `3ab9670`.

It is the least because the repair is one expression, already written and
tested in the release's own installed workflow; this host kept an older one at
adoption and nothing had ever exercised it.

It does not change any rule, any tool, or how a path branch is judged.

## Definition of done

- [ ] A push to `master` produces a green `cairn-check (protocol)` job, proved
      by the run this path's own integration triggers.
- [ ] A push to a `path/**` branch and a pull request are judged exactly as
      before, proved by this path's own branch runs.
- [ ] `CP-OPS-003`'s outcome 1 — *a push to `master` and to a `path/**` branch
      both go green* — is true for the first time, and its journal entry says
      it was closed before that was ever observed.

## Opening acceptance

```yaml
decision: accepted
accepted_by: jubette
accepted_roles: [initiator, reviewer]
accepted_at: 2026-09-22T09:48:00Z
scope_ref: atomik-project/coding-paths/CP-OPS-004/index.md#definition-of-done
scope_digest: sha256:08e3ffe19494eb5ad8dbabde6919f25628f051b6b14c74594a6ca2124b461363
```

Reviewed in chat: the `full` route and its trigger (control plane), the three
outcomes, the write surface — no other path is running — and the exclusion of
everything CP-OPS-003 touched that is not this expression. The owner's
go-ahead also covers the third outcome, which obliges this path to record that
CP-OPS-003 closed on an outcome nobody had observed.

## Documentation coverage

### Required

- `.github/workflows/cairn.yml` — the file being repaired
- `atomik-project/coding-paths/CP-OPS-003/index.md` — the outcome this path
  completes, and the review that claimed it early

### Deliberately excluded

- Everything CP-OPS-003 touched that is not this expression.

## Steps

- **[S01](./steps/S01.md)** — the base a trunk push is compared against — COMPLETE

## Resume

### Checkpoint

```text
commit : 98ba9bbe692724e9a2ccb3ca4e68ecbb81a1b267
unit   : 01 — S01, and candidate C, accepted by the owner on request #6
base   : 3ab967061124249cebe74c920cc9380d61d39952
trunk  : 3ab967061124249cebe74c920cc9380d61d39952
```

### Next action

Integrate: merge request #6, then the integrating commit recording done, the
journal entry, and the amendment to CP-OPS-003's entry. Read the trunk run the
merge triggers before ticking outcome 1.

### Blockers

None.

### Tried and rejected

- Leaving it and reporting the defect — rejected: the trunk is red now, and a
  red trunk teaches a writer to read past red, which is the failure mode this
  repository has already written down once.

### Reading order

1. `.github/workflows/cairn.yml@267a7009` — the expression as adoption kept it.

### Verify

```bash
npm run cairn-check
```
