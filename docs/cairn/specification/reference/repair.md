---
type: Cairn Reference
title: Repair procedures
description: What to do when a path has already violated the protocol, and how to record the violation instead of tidying it away.
tags: [cairn, reference, repair, operations, integrity]
timestamp: 2026-08-26T00:00:00Z
---

# Repair procedures

Every rule in this specification eventually gets broken — by a rushed session, a
misconfigured runner, an agent that skipped a step, or a person who did not know
the step existed. A protocol with no repair procedure has one implicit
instruction for that situation: tidy the history until the rule appears
satisfied. That destroys the evidence the protocol exists to keep, and it is
what actually happens in the absence of anything better.

Two rules govern every procedure below.

1. **A repair is a work unit.** It declares `type: repair`, appends a ledger
   entry naming the violation, refreshes the brief, and is committed and pushed
   like any other unit.
2. **A repair MUST NOT be the same work unit as the work that caused it.** A
   commit that both breaks and silently fixes a rule leaves nothing for anyone
   to read later.

A repair never edits history into a cleaner shape. Where a record is owed, it
supersedes rather than replaces.

## Branch created before registration

The path branch exists; the trunk has no declaration for it.

```bash
# Do NOT delete the branch. Find its actual branch point.
git merge-base origin/<trunk> path/<id>
```

Register retroactively in a `repair` unit: add the opening record and the path
declaration to the trunk, set `base_commit` to the object id the command above
printed — not to the current trunk tip, which would claim a base the work never
had — and name the omission in the ledger entry.

## Implementation changed after acceptance

The accepted candidate is void the moment its implementation moves.

1. Return `status` to `running`.
2. Produce a new candidate `C₂` and audit it.
3. Write a new closing record naming `C₂` and the record it supersedes.

The original acceptance is retained. It was a true statement about a commit that
is no longer proposed.

## An immutable record was edited

An edit to an immutable record cannot be undone by another edit — a second edit
is a second violation.

Add a superseding correction record that names the affected file, its object id
before the edit, its object id after, and what changed. Record the violation in
the ledger. The edited file stays as it is.

## Branch force-pushed without retention

```bash
# Recover what the local reflog still holds.
git reflog show path/<id>

# Push every recovered checkpoint to retention before doing anything else.
git push origin <recovered-oid>:refs/cairn/checkpoints/<path-id>/<n>
```

Recover from any surviving ref, another participant's clone, or a CI cache.
Ledger entries naming commits that cannot be recovered are marked
`unrecoverable` — never deleted. A ledger that quietly loses the entries it can
no longer resolve is worse than one that admits a gap.

## A retention ref was moved

Every declared unit still resolves a ref, so the per-unit check reports nothing.
The commit the ref used to name is the evidence.

```bash
git for-each-ref refs/cairn/checkpoints/cp-example-001
git log --format='%H %s' <base>..HEAD
# any commit in that range that is neither retained, nor provisional, nor HEAD
git update-ref refs/cairn/checkpoints/cp-example-001/<n> <original-oid>
git update-ref refs/cairn/checkpoints/cp-example-001/<n+1> <moved-onto-oid>
```

Restore the ref to the commit it originally named, then give the commit it was
moved onto its own ordinal and its own ledger entry. A moved ref usually means a
completed work unit was shipped under the previous unit's block, so there are
two facts to repair rather than one.

## A path branch declared `done`

`done` is a claim about the trunk, and a branch cannot make it.

Return the declaration to `ready` in a `repair` unit, then re-run integration
through the declared [transport](../concepts/integration-transport.md). If the
candidate did in fact land, the trunk integration unit records `done`; the
branch still does not.

## Scope digest mismatch at closing

The definition of done moved after it was accepted. Two ways out:

- restore the accepted text exactly, re-compute the digest, and close; or
- record a **scope amendment**: a new opening acceptance carrying the new digest
  and naming the record it supersedes, then re-close against it.

What is not available is closing against the original acceptance. That
acceptance was measured against text that no longer exists.

## Work committed outside `writes:`

Update the declaration in a `repair` unit and record the reason. A widening that
is recorded is ordinary protocol; one that is hidden is the violation, because
every predicate computed from the declaration silently weakens.

## Secret committed to an immutable record

Follow the [redaction ceremony](../index.md#redaction), beginning with rotation.
Rotation is first because it is the only step that changes the attacker's
position; every later step changes only what the repository serves.

## Reporting

A repair's ledger entry states what rule was violated, when, what evidence was
lost if any, and what the repair restored. That entry is the point of the whole
procedure: the next reader learns that the gap existed and how it was handled,
rather than inheriting a history that looks like it never happened.

Return to [repair a path that broke protocol](../index.md#repair-a-path-that-broke-protocol).
