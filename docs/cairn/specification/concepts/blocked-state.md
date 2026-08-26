---
type: Cairn Concept
title: Blocked state
description: A live path paused by a named condition.
tags: [cairn, concept, state]
timestamp: 2026-08-25T00:00:00Z
---

# Blocked state

`blocked` means execution cannot continue until a named condition changes.

The path keeps its [branch](./branch.md), base [commit](./commit.md), current
[writer assignment](./writer-assignment.md), last
[remote checkpoint](./remote-checkpoint.md), blocker, and explicit unblock
condition. It remains in the [live view](./live-view.md) because it is still
resumable work. It may return to `running` or archive as `abandoned` or
`superseded`.

It does not mean the path has lost its identity or history.

Related: [running state](./running-state.md), [live view](./live-view.md),
[handoff](./handoff.md).
