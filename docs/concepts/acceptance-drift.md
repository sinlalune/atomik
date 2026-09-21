---
type: Cairn Concept
title: Acceptance drift
description: The predicate that decides whether an acceptance still holds after the trunk has moved.
tags: [cairn, concept, acceptance, integration, trunk]
timestamp: 2026-08-26T00:00:00Z
---

# Acceptance drift

Acceptance drift is the question of whether a closing acceptance, made against
one [trunk](./trunk.md) state, still describes the change that would land now.

## Build the idea

A [candidate](./implementation-candidate.md) is accepted after being rebased
onto a trunk tip `T`. Between acceptance and integration, other paths land, and
the trunk becomes `T'`. Something has to decide whether the acceptance survives.

The obvious rule — require `T' == T` at integration — is wrong, and wrong in a
way that is easy to miss. It makes integration first-come-first-served: every
landing invalidates every other open acceptance, so each path must re-rebase,
re-audit and re-accept. If audit and acceptance together take longer than the
trunk's landing interval, nothing ever closes. The protocol livelocks precisely
on the busy repositories that need it.

The relevant question is narrower. An acceptance is a judgement about a diff
read against a body of knowledge. It is threatened only if the trunk moved
*underneath that reading*.

## In Cairn

The closing record names the base it was accepted against:

```yaml
base: <full object id of T>
```

An acceptance remains valid while the trunk delta from `T` to `T'` touches no
file matched by the union of the path's `writes:` and `governs:` declarations.

- **`writes:`** — the surface the candidate changed. A trunk change there means
  the merged result is not the audited result.
- **`governs:`** — the documents the audit reasoned from. A trunk change there
  means the audit's reference frame moved, even though the diff did not.

If the delta touches neither, the path integrates the accepted candidate
unchanged. If it touches either, the acceptance is invalidated: the path returns
to [`running`](./running-state.md), rebases onto `T'`, produces a new candidate,
and repeats audit and acceptance.

The predicate is deliberately conservative in one direction and honest about it:
two paths writing genuinely disjoint surfaces do not invalidate each other, and
two paths writing the same surface always do, whether or not Git would have
reported a [conflict](./conflict.md).

## It does not prove

Path-based overlap is a proxy for semantic overlap. A trunk change outside both
declarations can still break the candidate — a renamed function in an
undeclared file, a changed default. The predicate bounds re-work; the product
checks run at integration are what catch the rest.

Related: [closing acceptance](./closing-acceptance.md),
[declared write surface](./declared-write-surface.md),
[integration transport](./integration-transport.md),
[implementation candidate](./implementation-candidate.md).
