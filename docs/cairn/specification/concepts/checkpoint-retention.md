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

**The namespace is not a branch, and it is not fetched by default.** `refs/cairn/*`
sits outside `refs/heads/*` and `refs/tags/*`, which are the only two namespaces
an ordinary clone or a CI checkout action retrieves. Any environment that judges
retention MUST fetch it explicitly:

```bash
git fetch origin '+refs/cairn/*:refs/cairn/*'
```

An environment that has not done so sees an empty namespace, and an empty
namespace is **missing evidence, not evidence of absence** — the two are
indistinguishable from inside one checkout, because listing refs under a
namespace that was never fetched succeeds and prints nothing, exactly as listing
a namespace that is genuinely empty does. A checker MUST report that state as
[inconclusive](./inconclusive-finding.md) rather than as a set of confident
findings naming refs it cannot see.

## It does not prove

A retained ref proves an object is reachable, not that the working state it
captured was correct or complete. Retention also does not make history
immutable: a participant who can delete refs can delete these. It removes an
accident, not an adversary.

Nor does a *local* retention ref prove retention. The property is about the
remote: a ref that exists only in one working copy is orphaned by the same push
it was meant to survive. Retention is checked where the refs are visible and
claimed only for what a fetch can reach.

Related: [remote checkpoint](./remote-checkpoint.md), [rebase](./rebase.md),
[work ledger](./work-ledger.md), [fetch and push](./fetch-and-push.md),
[tamper evidence](./tamper-evidence.md).
