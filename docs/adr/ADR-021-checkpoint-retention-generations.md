---
type: Atomik ADR
title: 'ADR-021: Retention refs carry a generation, and an empty intersection is a violation rather than an exemption'
description: A rebase gives every retained unit a second truthful object id and the flat ref namespace has one slot, so retention silently stops covering the branch it is meant to protect; generations give each rewrite its own namespace, the current generation is derived from ancestry rather than stored, and the range floor stops being the declared registration base.
tags: [adr, cairn, protocol, retention, rebase, resumability, refs]
timestamp: 2026-09-01T00:00:00Z
adr:
  id: ADR-021
  status: proposed
  date: 2026-09-01
---

# ADR-021: Retention refs carry a generation

Status: proposed
Date: 2026-09-01
Amends: ADR-019 decision 1 (checkpoint retention precedes any rewriting push)
Extends: ADR-012 (parallel paths, self-merge — the rebase gate), ADR-016 (enforcement integrity)

## Context

[ADR-019](./ADR-019-cairn-v0-2-revision.md) decision 1 requires every
ledger-named commit to be reachable from `refs/cairn/checkpoints/<path-id>/<n>`
before any rewriting push, and the
[concept note](../cairn/specification/concepts/checkpoint-retention.md) adds that
those refs are append-only: once pushed, a ref is never moved or deleted.

Both sentences are right, and together they describe a namespace that cannot
survive the operation Cairn makes mandatory.

**A rebase gives one unit two truthful object ids, and the namespace has one
slot.** `<n>` is the ledger ordinal. After the pre-merge rebase, unit 13 exists
twice: the commit it was verified as, and the reconstructed copy now on the
branch. The ref may not move — moving it orphans the commit the ledger row was
verified against, which is the violation CP-OPS-002 S07k found by committing it —
so the rebased copy is retained by nothing, and nothing in the namespace can name
it.

**The checker then reports `OK` at exactly that moment.**
`unretainedCheckpoints` finds the oldest retained commit on the branch and judges
from there, because commits older than the convention cannot be judged by it.
When a rebase leaves no retained commit on the branch at all, `findIndex` returns
`-1` and the function returns the empty list — "nothing to judge" — for a branch
on which nothing at all is retained. The heuristic that excludes pre-convention
history also excludes total orphaning, and the two are indistinguishable from
inside it.

Measured on `path/cp-ops-002` at `cec817b`, 2026-09-01:

```text
  55  commits in the checker's range (base_commit 7aa3b1d..HEAD)
  27  retention refs for this path
  14  refs naming a commit on the branch          (units 14–27)
  13  refs naming a commit that is NOT            (units 01–13)
  41  commits below the judged floor — 75% of the range
   0  orphaned commits reported.  Gate: OK
```

The 13 are not lost: every one of them has its rebased copy on the branch, and
every copy is retained by no ref.

```text
01  e787174 -> 53b11f0 on branch, retained by no ref
02  d1f3830 -> 27b0dff on branch, retained by no ref
...
13  ba04251 -> 6adc217 on branch, retained by no ref
orphan refs with a live rebased copy: 13; without: 0
```

So the next rewriting push orphans thirteen completed checkpoints that no ref
holds, and the gate that exists to prevent precisely that is silent. The
retention property has been off since the rebase of 2026-08-31 and no run said
so.

The 41 unjudged commits split cleanly, and the split is the whole design
question:

```text
  18  completed steps S00–S07e — predate retention entirely, nothing was ever
      retained for them, correctly below any floor
  13  rebased copies of units 01–13 — the defect
  10  trunk commits that arrived with the rebase, six of them CP-UI-TYPOGRAPHY's,
      retained under ITS path id and not this one
```

The last ten are a second substitution. The range floor is the declared
`base_commit`, which is where the path was *registered*; after a rebase the
path's own work begins at the trunk tip the branch was rebased onto, and
everything between the two is somebody else's commits. `base_commit` is standing
in for "where this path's commits begin" — the same shape this path has now found
nine times, a name substituted for the fact it resembles.

Finally, the namespace has a mechanical constraint that decides the notation.
Git refs are paths, so a ref cannot be both a leaf and a directory. Verified in
this repository:

```text
$ git update-ref refs/cairn/probe/01     HEAD
$ git update-ref refs/cairn/probe/01/14  HEAD
fatal: cannot lock ref 'refs/cairn/probe/01/14':
       'refs/cairn/probe/01' exists; cannot create 'refs/cairn/probe/01/14'
```

Any generation segment named with an ordinal collides with the flat unit refs
already pushed. The migration has to be readable without touching a single
existing ref, because touching them is the thing being forbidden.

## Decision

### 1. A retention ref names a generation

```text
refs/cairn/checkpoints/<path-id>/g<NN>/<n>
```

`<n>` stays the ledger ordinal, unchanged and still append-only. `g<NN>` is a
zero-padded generation, starting at `g01`. The `g` prefix is not decoration: it
is what keeps the segment out of the ordinal alphabet, so a generation directory
can never collide with a flat unit ref.

A **generation** is one linear version of the path branch. It opens when the
branch is created or rewritten, and it closes at the next rewriting push. Within
a generation, retention behaves exactly as ADR-019 specified.

Refs are still never moved and never deleted, in any generation. A rebased copy
is a new commit and gets a new ref; the commit it was reconstructed from keeps
the ref it already had. Both promises now hold at once, which is what the flat
namespace could not do.

### 2. The current generation is derived from ancestry, never stored

> The current generation is the highest-numbered generation all of whose refs are
> ancestors of the branch tip.

A generation with even one ref that is not an ancestor of the tip has been closed
by a rewrite, and retention continues at the next number. A path with no
generation opens `g01`.

This is derived from two facts already in the checkout — the ref list and
ancestry — and needs no counter, no field in the path record, and no memory
between runs. A stored generation would be a claim, a claim needs a rule to check
it, and the rule would have nothing to check it against but the refs. That is the
reason `base_commit` accuracy is still an open hole in `paths.md`: the protocol
recorded a number instead of deriving one.

### 3. Opening a generation is a step of the rewrite, not a later chore

Before a rewriting push completes, every completed commit of the rebased branch
from the current generation's floor upward MUST be retained in the new
generation. Retention is part of the rebase, in the same work unit, in the same
way the ledger and the brief are part of a step.

### 4. An empty current generation is a violation, and it is stated as one

Three states must read differently, and today two of them read the same:

```text
the whole path namespace is empty       -> INCONCLUSIVE.  Missing evidence:
                                           refs/cairn/* is fetched by no clone
                                           and no checkout action (S08b)
the current generation is empty while   -> BLOCKING, definite.  The branch was
older generations exist                    rewritten and nothing has been
                                           retained since
the current generation is populated     -> judge from its floor upward
```

The middle row is what `findIndex → -1` currently answers with an empty list.
An empty intersection is not an absence of subject matter; it is the subject
matter. The instruction that goes with it is specific — open generation `g<NN>`
and retain the branch's completed commits — because a finding that cannot be
acted on is a finding people learn to scroll past.

### 5. The retention range floor is the path's own commits

The range is `merge-base(<trunk>, HEAD)..HEAD`, not `<base_commit>..HEAD`. Ten
commits currently in the range belong to other paths and are retained under their
own path ids; judging them against this path's refs would either produce ten
false findings or require an exemption for the state that caused them.

Where the trunk ref cannot be resolved — a shallow checkout, a clone with no
trunk — the range is unknown and the finding is
[inconclusive](../cairn/specification/concepts/inconclusive-finding.md), never a
pass. This is the same fail-closed rule ADR-016 applied to every predicate that
cannot name its subject.

### 6. A declared unit resolves in the current generation

`retentionDue` asks whether each declared unit has a ref. It now asks for
`<path-id>/g<NN>/<n>` at the current generation, so "fetch unit 13 and resume"
returns the copy that is actually on the branch. Earlier generations answer the
other question — what the ledger row was verified against — and remain reachable
for exactly that.

## Consequences

- The gate goes red on `path/cp-ops-002` the moment this is implemented, and
  stays red until generation `g01` is opened. That is the honest state: 31 of
  this path's 45 commits are completed checkpoints held by no ref, and 13 of
  them are one rewriting push from being unreachable.
- The ref count grows by one generation per rewriting push, not per commit. This
  branch, over five weeks and one rebase, would hold two generations.
- Flat refs already pushed are never touched, never moved, never deleted. They
  are read as a generation that predates the notation and is never written again
  (`g00` by convention, absent from the wire). Their objects stay reachable,
  which is the only thing they were ever asked to guarantee.
- `refs/cairn/*` remains outside what a clone or `actions/checkout` fetches, so
  the explicit fetch stays part of conformance. Generations add depth to that
  namespace and change nothing about the refspec.
- `cairn-init` must scaffold generation-aware retention from the start. A flat
  namespace handed to an adopter is a migration handed to an adopter.
- Open hole 1 in `paths.md` — `base_commit` accuracy is unchecked — is narrowed,
  not closed. Retention stops depending on that number; the registration
  ordering still does.

## Alternatives considered

- **Move `<n>` to the rebased copy.** The obvious fix, and it is the exact
  violation `unretainedCheckpoints` was written to catch after CP-OPS-002 S07k
  committed it by hand. A moved ref orphans the commit the ledger row was
  verified against and leaves every declared unit still resolving, so the damage
  is invisible to the per-unit check. Rejected.
- **Content-addressed retention: `refs/cairn/checkpoints/<path-id>/<oid>`.**
  Append-only for free — the name is the object, so it cannot be moved without
  becoming detectably false — and no generation is needed. Rejected because the
  ledger ordinal leaves the ref name, and the ordinal is the entire reason the
  namespace exists: a work unit cannot name its own hash while it is being
  written, so the ledger says *which unit* and the ref says *which commit*.
  Answering "fetch unit 13" would mean walking every ref and reading commit
  messages.
- **Both namespaces — ordinals for resolution, content addresses for
  reachability.** Delivers the same two guarantees with two namespaces to fetch,
  two to check, and two to explain. Generations deliver them with one.
- **Name the generation after the base commit it was rebased onto.** Derived from
  a fact, like decision 2, and it fails on the case that motivated retention in
  the first place: an amend or an interactive fixup rewrites the branch without
  moving the base, so two generations claim one name and the second silently
  overwrites the first. Ancestry distinguishes them; the base does not.
- **Store `generation:` in the path record.** Rejected under decision 2, and for
  the reason ADR-020 gave about counts: a number a human maintains is a claim
  about a fact that is already in the repository.
- **Forbid rebasing path branches; reach a current base by merge.** Already a
  conforming option in ADR-019, and it stays one. Rejected as the default because
  the rebase gate is what lets self-merge work without an integrator or a queue
  (`paths.md`): requiring the branch to contain the trunk tip serializes the
  merge without serializing the work.
- **Leave `unretainedCheckpoints` alone and accept the blindness.** Rejected on
  the measurement. A rule that reports `OK` over the condition it was written for
  is worse than no rule, because the `OK` is read as evidence.
- **Implement the range-floor repair (decision 5) now, without generations.**
  Rejected on measurement rather than on principle: with the floor at the
  merge-base, 31 of this path's 45 commits report as unretained and there is no
  conforming way to retain them until generations exist. The repair would land as
  a red gate with no green move available, which teaches the one lesson a gate
  must never teach.

## Migration / rollback

1. **Nothing is written to an existing ref.** The 27 flat refs on this path and
   the 6 on `cp-ui-typography` stay exactly as they are.
2. The checker reads a flat ref as belonging to the pre-notation generation. It
   is judged for reachability only, never for internal consistency — the flat
   namespace mixes two generations and cannot be made consistent without moving
   a ref.
3. The implementing unit opens `g01` on `path/cp-ops-002` by retaining every
   completed commit from unit 01's rebased copy (`53b11f0`) upward: twenty-seven
   refs, one push, no deletion. The eighteen commits below that floor predate
   retention and stay below it.
4. Rollback is to stop writing generations. Flat reading is retained, so a
   checkout that has both shapes keeps working; the property reverts to what it
   is today, which is unenforced across a rebase.

## Links

- [ADR-019](./ADR-019-cairn-v0-2-revision.md) — decision 1, amended here
- [ADR-016](./ADR-016-cairn-enforcement-integrity.md) — fail closed when a
  predicate cannot name its subject
- [ADR-012](./ADR-012-parallel-paths-self-merge.md) — the rebase gate this
  decision exists to survive
- [Checkpoint retention](../cairn/specification/concepts/checkpoint-retention.md)
  — the concept note, amended on acceptance
- [Rebase](../cairn/specification/concepts/rebase.md) ·
  [Inconclusive finding](../cairn/specification/concepts/inconclusive-finding.md)
- [`paths.md`](../../atomik-project/coding-paths/paths.md) — open hole 1,
  narrowed by decision 2
