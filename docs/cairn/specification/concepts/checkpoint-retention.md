---
type: Cairn Concept
title: Checkpoint retention
description: Keeping every commit the ledger names reachable, so a rewriting push cannot orphan the history a path promised was resumable.
tags: [cairn, concept, checkpoint, git, resumability]
timestamp: 2026-08-26T00:00:00Z
---

# Checkpoint retention

Checkpoint retention is the requirement that every commit a path's
[work ledger](./work-ledger.md) names remains reachable from a ref after the
path branch is rewritten.

## Build the idea

A [rebase](./rebase.md) reconstructs commits on a newer base, which changes
their [object ids](./commit-hash.md). Publishing the result replaces the remote
branch, and the original commits become unreachable — Git keeps the objects for
a while, then collects them.

That is ordinary Git behaviour, and for a throwaway branch it is harmless. It is
not harmless here. Cairn's ledger names its checkpoints by object id and
promises that another participant can fetch one and resume. After a rewriting
push, those ids resolve to nothing, and the promise fails exactly when it is
needed. Rebase-before-close therefore attacks resumability directly, not as a
side effect.

## In Cairn

Before any rewriting push of a path branch, every commit the ledger names MUST
already be reachable from a retention ref on the same remote:

```text
refs/cairn/checkpoints/<path-id>/<n>
```

`<n>` is the ledger's own ordinal for that checkpoint, so a ledger entry and its
retained ref name the same thing. Retention refs are append-only: a ref, once
pushed, is never moved or deleted while the path record is retained.

A repository that cannot create or push that namespace has one other conforming
option — forbid rewriting pushes on path branches entirely, and reach a current
base by [merge](./merge.md) instead of rebase. Silently rewriting without
retention is not a third option.

## It does not prove

A retained ref proves an object is reachable, not that the working state it
captured was correct or complete. Retention also does not make history
immutable: a participant who can delete refs can delete these. It removes an
accident, not an adversary.

Related: [remote checkpoint](./remote-checkpoint.md), [rebase](./rebase.md),
[work ledger](./work-ledger.md), [fetch and push](./fetch-and-push.md),
[tamper evidence](./tamper-evidence.md).
