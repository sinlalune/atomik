---
type: Cairn Concept
title: Handoff
description: The durable information needed for another authorised participant to continue a path.
tags: [cairn, concept, execution, team]
timestamp: 2026-08-25T00:00:00Z
---

# Handoff

A handoff states where a [coding path](./coding-path.md) is, what evidence
exists, and the first action required to continue it.

## In Cairn

The [work ledger](./work-ledger.md) is primary memory. A brief under
`project/briefs/<lowercase-id>-handoff.md` is a concise projection refreshed at
each completed [work unit](./work-unit.md). It names the
[worktree](./worktree.md), [branch](./branch.md),
[remote checkpoint](./remote-checkpoint.md),
gates, current state, blockers, governing documents, and next action.

A writer change occurs only at a remote checkpoint and updates the assignment.

## It does not prove

A brief can drift if edited independently; it is disposable and never replaces
the path ledger.

Related: [writer assignment](./writer-assignment.md),
[work ledger](./work-ledger.md), [remote checkpoint](./remote-checkpoint.md).
