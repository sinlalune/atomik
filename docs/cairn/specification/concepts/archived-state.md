---
type: Cairn Concept
title: Archived state
description: The terminal retained state of a completed, abandoned, or superseded path.
tags: [cairn, concept, state, archive]
timestamp: 2026-08-25T00:00:00Z
---

# Archived state

`archived` means the path is no longer live but remains available as project
history.

It requires exactly one resolution:

- `completed` after `done`;
- `abandoned` when unfinished work is intentionally stopped;
- `superseded` when another path or decision replaces it.

The [path record](./path-record.md) is retained rather than deleted. An archived
state is terminal.

It does not imply integration unless its resolution is `completed` and the
[remote](./remote.md) [trunk](./trunk.md) evidence exists.

Related: [lifecycle](./lifecycle.md), [done state](./done-state.md),
[record integrity](./record-integrity.md).
