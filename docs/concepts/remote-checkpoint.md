---
type: Cairn Concept
title: Remote checkpoint
description: A completed work-unit commit proved reachable from its remote path branch.
tags: [cairn, concept, execution, remote]
timestamp: 2026-08-26T00:00:00Z
---

# Remote checkpoint

A remote checkpoint is an exact completed [work-unit](./work-unit.md)
[commit](./commit.md) that the [remote](./remote.md) path
[branch](./branch.md) contains.

## Build the idea

A local commit survives one process but not necessarily one machine. Publishing
it to a shared remote makes it available for verification and resumption.

## In Cairn

Every completed step ends with a commit, immediate push, and ancestry proof
against the remote path branch. The path record and
[handoff brief](./handoff.md) identify that exact
[object id](./commit-hash.md) and the next action.

A checkpoint is not merely a pushed commit. A
[provisional commit](./provisional-commit.md) is also pushed, and is
deliberately not a checkpoint: it preserves incomplete work without claiming a
resume point. The difference is the mark, not the location.

Because the ledger names checkpoints by object id, any rewriting push requires
[checkpoint retention](./checkpoint-retention.md) first. Otherwise the ledger
keeps its promise in words and loses it in refs.

## It does not prove

A checkpoint proves that a state is retrievable and was declared complete. It
does not prove the state is correct — that is what the gates run inside the work
unit are for.

Related: [remote](./remote.md), [fetch and push](./fetch-and-push.md),
[handoff](./handoff.md), [checkpoint retention](./checkpoint-retention.md).
