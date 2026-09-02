---
type: Cairn Concept
title: Blocked state
description: A live path paused by a named condition, entered from execution or from a stalled acceptance.
tags: [cairn, concept, state]
timestamp: 2026-08-26T00:00:00Z
---

# Blocked state

`blocked` means progress cannot continue until a named condition changes.

The path keeps its [branch](./branch.md), base [commit](./commit.md), current
[writer assignment](./writer-assignment.md), last
[remote checkpoint](./remote-checkpoint.md), blocker, and explicit unblock
condition. It remains in the [live view](./live-view.md) because it is still
resumable work.

It is reached from [`running`](./running-state.md), when execution stalls, and
from [`ready`](./ready-state.md), when acceptance or integration stalls. The
second case is the one most easily overlooked: a candidate waiting on an
unavailable reviewer is blocked, and saying so is more useful than a `ready`
that quietly ages.

It leaves only to `running` — reaching `ready` again requires producing and
auditing a candidate, which is execution — or to
[`archived`](./archived-state.md) as `abandoned` or `superseded`.

It does not mean the path has lost its identity or history.

Related: [running state](./running-state.md), [ready state](./ready-state.md),
[live view](./live-view.md), [handoff](./handoff.md).
