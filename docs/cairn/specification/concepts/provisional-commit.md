---
type: Cairn Concept
title: Provisional commit
description: A pushed, explicitly marked commit that preserves incomplete work without claiming to be a checkpoint or a candidate.
tags: [cairn, concept, checkpoint, execution]
timestamp: 2026-08-26T00:00:00Z
---

# Provisional commit

A provisional commit is a commit on a path branch that is pushed for durability
and marked as not complete.

## Build the idea

Cairn's thesis is that state which exists only in a conversation or a working
tree is state the project has already lost. An agent's mid-session working
tree — half a refactor, a failing test, a document being rewritten — is the
single most losable state in the whole protocol.

A rule that keeps work under review uncommitted and unpushed therefore forbids
publishing precisely that state. It protects the meaning of "complete" at the
cost of the thing the protocol exists to prevent. A separate mark solves both:
the work becomes durable, and "complete" keeps its meaning because the commit
says out loud that it is not.

## In Cairn

A provisional commit MUST be pushed to the remote path branch like any other
commit, and MUST carry the trailer:

```text
Cairn-Provisional: <reason>
```

It is a durable object, not a [remote checkpoint](./remote-checkpoint.md). It
MUST NOT be reported as a completed [work unit](./work-unit.md), MUST NOT be
named as a resume point in a [handoff brief](./handoff.md), and MUST NOT be
proposed as an [implementation candidate](./implementation-candidate.md).

Provisional commits are excluded from candidate identity. Before a candidate
`C` is produced, every provisional commit between the base and `C` is folded
into the completed work unit it was drafting; the content survives and the
marker does not. Because folding rewrites published commits, it requires
[checkpoint retention](./checkpoint-retention.md) first.

Work delivered for a user or reviewer to inspect before acceptance is the
ordinary case: it is pushed as a provisional commit, inspected at that exact
object id, and folded once it passes.

## It does not prove

The mark records an intent, not a quality. A provisional commit may be broken,
may never be folded, and may be abandoned with its path. It guarantees only
that the work is recoverable and is not being counted as something it is not.

Related: [remote checkpoint](./remote-checkpoint.md),
[work unit](./work-unit.md),
[implementation candidate](./implementation-candidate.md),
[checkpoint retention](./checkpoint-retention.md).
