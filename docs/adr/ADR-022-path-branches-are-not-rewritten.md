---
type: Atomik ADR
title: 'ADR-022: Path branches are not rewritten, and a current base is reached by merge'
description: The retention namespace, its generations, its three-state verdict and its non-default fetch all exist to pay for one choice — the mandatory pre-merge rebase — and the rationale for preferring rebase over merge does not distinguish them, because merging the trunk into the branch also makes the branch contain the trunk tip; forbidding rewriting pushes removes the cause instead of maintaining the compensation.
tags: [adr, cairn, protocol, retention, rebase, merge, simplicity]
timestamp: 2026-09-01T00:00:00Z
adr:
  id: ADR-022
  status: accepted
  date: 2026-09-01
---

# ADR-022: Path branches are not rewritten

Status: accepted
Date: 2026-09-01
Accepted: 2026-09-01, owner
Supersedes: ADR-021 as the DEFAULT path-history policy; ADR-021 remains the correct design for any host that keeps rewriting
Amends: ADR-019 decision 1 (checkpoint retention precedes any rewriting push), ADR-012 (the rebase gate)

## Context

[ADR-021](./ADR-021-checkpoint-retention-generations.md) was accepted and
implemented one day before this decision, and it is not wrong. It correctly
repairs a namespace that could not survive the operation Cairn makes mandatory.
This ADR asks the question one level up: **why is that operation mandatory?**

The machinery is entirely downstream of a single choice:

```text
mandatory pre-merge rebase
  └─ rewrites every commit on the branch
      └─ ledger-named commits stop being reachable
          └─ retention refs, to pin them
              └─ one unit now has two truthful object ids
                  └─ generations, g<NN>
                      └─ a current generation derived from ancestry
                          └─ a three-state verdict, because absence is unreadable
                              └─ refs/cairn/* fetched by no clone and no CI action
                                  └─ repair procedures for a ref that was moved
```

Every level below the first exists to pay for the first. None of it is protocol:
it is compensation.

**What it has cost, measured on this repository.** `CP-OPS-002` S07k repointed a
ref by hand — the violation `unretainedCheckpoints` was then written to catch.
S08j found that retention *switched itself off during the rebase*: the retained
set stopped intersecting the branch, `findIndex` returned `-1`, and the gate
reported `OK` over its own central failure. Two refs on this path, `g01/32` and
`g01/33`, exist only as recovery pins for commits that carried no work unit.
Retention is the direct subject of S08b, S08j and S08k, and a substantial part of
S08q. Thirty-seven refs now live in a namespace that is invisible to a directory
listing, that no clone or `actions/checkout` retrieves, and whose absence is
indistinguishable from compliance without a dedicated inconclusive state.

**The rationale for the rebase does not distinguish it from a merge.** ADR-021
considered forbidding rewriting pushes and rejected it *as the default*, for one
stated reason:

> the rebase gate is what lets self-merge work without an integrator or a queue:
> requiring the branch to contain the trunk tip serializes the merge without
> serializing the work.

The property is real and worth keeping. But **merging the trunk into the path
branch also makes the branch contain the trunk tip**, and satisfies that sentence
exactly as a rebase does. The serialization itself does not come from the rebase:
it comes from the push being rejected when the trunk has moved, which happens
identically under either operation. The argument selects *"the branch must
contain the trunk tip"*, which both satisfy; it does not select *"and every
commit must be rewritten to get there"*, which only one requires.

That is the gap. Cairn has been paying for the rewriting without a rationale that
asks for it.

## Decision

### 1. A path branch is not rewritten after it is published

No rebase, no amend, no `reset --soft` fold, no `push --force`, no
`--force-with-lease`, on any branch that has been pushed. A published commit
keeps its object id for the life of the path.

### 2. A current base is reached by merging the trunk into the branch

Where the previous protocol rebased onto the trunk, the branch now merges the
trunk in. The branch still contains the trunk tip before it is integrated, so the
serialization property ADR-021 named is preserved in full.

### 3. Retention becomes unnecessary, and is disabled rather than deleted

If nothing is rewritten, every ledger-named commit stays reachable from the
branch, and after a `--no-ff` integration merge it stays reachable from the trunk
permanently. **The branch is the retention.** `checkpointRetentionRef` becomes
`null` and `pathHistoryPolicy` becomes `forbidden` — the pair the schema-1 loader
already validates together — which disables the retention predicate without
touching typed work-unit validation.

The reference implementation of retention, its generations and its three-state
verdict are KEPT in the checker and the specification. They are the correct
design for a host that chooses to keep rewriting, and ADR-021 remains accepted
for that host. This decision changes Cairn's default, not its capability.

### 4. Existing refs are never touched

The thirty-seven refs on `path/cp-ops-002` and the six on `cp-ui-typography`
stay exactly where they are, unread by the gate and unmoved by anything. They
recorded something true and are now history rather than enforcement. Deleting
them would be the same category of error as moving one.

### 5. No-rewriting is enforced, not merely declared

A policy that only appears in configuration is a claim, and this path exists
because of claims that no predicate checked. Under `pathHistoryPolicy:
forbidden`, the branch's own published tip MUST remain an ancestor of `HEAD`. A
local checkout can evaluate that directly against its upstream, so the
replacement for retention is a predicate rather than a promise.

This is deliberately narrower than what it replaces. It proves that *this*
checkout has not rewritten what it published; it cannot prove a remote history
was never rewritten by someone else, and it says so rather than implying
otherwise.

### 6. Provisional commits stay, folding goes

[ADR-019](./ADR-019-cairn-v0-2-revision.md)'s provisional commit is unaffected:
work in progress is still pushed with its marker rather than held on disk. What
goes is the `git reset --soft` fold that turned several provisional commits into
one work-unit commit, because that is a rewrite. A provisional commit is instead
superseded by the completed unit's own commit and remains in the branch's
history, marked as what it was.

This is the real price of the decision, and it is stated as a cost rather than
sold as a benefit: the branch history becomes longer and less tidy, and it
contains commits that were never a completed unit.

## Consequences

- **Removed:** the pre-merge rebase, the generation-opening step that belongs to
  it, the force-push, the fold, and — for this host — the ref namespace with its
  fetch requirement and its three-state verdict.
- **Preserved:** the branch contains the trunk tip before integration; the exact
  integration candidate is built locally with `merge --no-ff --no-commit` and
  tested before it lands, so checked identity and landed identity stay equal;
  audit and acceptance still bind to one full object id.
- **Simplified by consequence:** candidate `C` no longer changes identity when
  the trunk moves, because nothing reconstructs it. Acceptance drift becomes a
  question about *meaning* — did the trunk move inside `writes:` or `governs:` —
  rather than about identity.
- **Cost:** non-linear branch history, provisional commits retained in it, and
  merge commits on path branches.
- **Not claimed:** that a remote can be prevented from accepting a rewriting
  push. That requires host protection, which this repository declines at tier
  `ci`. Decision 5 is what a local reader can actually prove.

## Alternatives considered

- **Keep the rebase and keep generations.** The status quo of one day. Rejected
  on the accumulated cost above, and because the seed reconciliation in S08q
  showed the apparatus propagating into the artefact an adopter copies: every
  adopter would inherit compensation for a choice they were never shown.
- **Keep the rebase, drop retention.** Rejected in ADR-021 and still rejected:
  rewriting without retention silently orphans the commits the ledger names. The
  choice is not *rebase without cost*; it is *rebase with retention* or *no
  rewriting*.
- **Squash-merge at integration.** Rewrites the whole branch into one commit at
  the moment the ledger is most complete, which destroys exactly the per-unit
  history the ledger names. Rejected.
- **Host branch protection instead of a predicate** (`require branches to be up
  to date`, or a merge queue). It would deliver the serialization property and
  more, and it is the right answer at enforcement tier `protected`. Rejected
  here because this repository is tier `ci` by owner ruling 9 and claims no host
  protection; a protocol that requires a GitHub setting to be correct is not
  free-standing.
- **Deleting ADR-021 and its implementation.** Rejected. It is the correct design
  for a rewriting host, it is implemented and tested, and a protocol that can
  only be adopted by repositories willing to forbid rewriting is narrower than
  one that defaults to it and supports the alternative.

## Migration / rollback

1. Nothing is written to, moved from, or deleted in any existing ref namespace.
2. `cairn.config.json` sets `checkpointRetentionRef: null` and
   `pathHistoryPolicy: forbidden`. The loader already requires those two to agree.
3. The no-rewriting predicate (decision 5) lands in the same unit as the flip, so
   the policy is never merely declared.
4. `CP-OPS-002` itself stops rebasing from that unit onward. It has not yet
   rebased under `g01`, so no generation is closed and no `g02` is ever opened.
5. Rollback is to restore the two configuration fields. The retention
   implementation, its tests and its specification text are untouched by this
   decision, so rollback is a configuration change rather than a re-implementation.

## Links

- [ADR-021](./ADR-021-checkpoint-retention-generations.md) — the design this
  supersedes as a default and preserves as an option.
- [ADR-019](./ADR-019-cairn-v0-2-revision.md) — decision 1, amended here.
- [checkpoint retention](../cairn/specification/concepts/checkpoint-retention.md)
  — already names the no-rewriting policy as the one other conforming option.
