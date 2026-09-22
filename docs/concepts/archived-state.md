---
type: Cairn Concept
title: Archived state
description: The terminal retained state of a completed, abandoned, or superseded path.
tags: [cairn, concept, state, archive]
timestamp: 2026-08-26T00:00:00Z
---

# Archived state

`archived` means the path is no longer live but remains available as project
history.

It requires exactly one resolution:

- `completed` after `done`;
- `abandoned` when unfinished work is intentionally stopped;
- `superseded` when another path or decision replaces it.

The [path record](./path-record.md) is retained rather than deleted. `archived`
is terminal: it has no outgoing transition, and its `resolution` does not change
once written.

That is not the same as saying the record can never appear in a later diff. A
validator comparing two commits will often see an archived record that declared
`archived` before and declares it now. That is an unchanged state, not a
self-transition, and the [lifecycle](./lifecycle.md) accepts it for every state
without listing an `archived → archived` edge that no event ever produces.

It does not imply integration unless its resolution is `completed` and the
[remote](./remote.md) [trunk](./trunk.md) evidence exists.

Related: [lifecycle](./lifecycle.md), [done state](./done-state.md),
[record integrity](./record-integrity.md).
