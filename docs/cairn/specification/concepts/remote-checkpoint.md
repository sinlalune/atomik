---
type: Cairn Concept
title: Remote checkpoint
description: A completed path commit proved reachable from its remote path branch.
tags: [cairn, concept, execution, remote]
timestamp: 2026-08-25T00:00:00Z
---

# Remote checkpoint

A remote checkpoint is an exact completed work-unit [commit](./commit.md) that
the [remote](./remote.md) path [branch](./branch.md) contains.

## Build the idea

A local commit survives one process but not necessarily one machine. Publishing
it to a shared remote makes it available for verification and resumption.

## In Cairn

Every completed step ends with a commit, immediate push, and ancestry proof
against the remote path branch. The path record and handoff identify that hash
and the next action.

## It does not prove

Uncommitted work under user inspection is intentionally not a checkpoint and
must not be reported as complete.

Related: [remote](./remote.md), [push](./push.md), [handoff](./handoff.md).
