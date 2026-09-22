---
type: Cairn Concept
title: Running state
description: A path that is accepted, registered, and available for execution.
tags: [cairn, concept, state]
timestamp: 2026-08-25T00:00:00Z
---

# Running state

`running` means a path has [opening acceptance](./opening-acceptance.md), is
registered on the [trunk](./trunk.md), and may execute.

It retains its canonical id, [branch](./branch.md), base [commit](./commit.md),
current [writer assignment](./writer-assignment.md), step, and
[remote checkpoint](./remote-checkpoint.md). It may become `blocked`, produce an
exact `ready` candidate, or archive without integration as `abandoned` or
`superseded`.

It does not mean that a process is continuously active.

Related: [coding path](./coding-path.md), [blocked state](./blocked-state.md),
[ready state](./ready-state.md).
