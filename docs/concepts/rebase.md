---
type: Cairn Concept
title: Rebase
description: Reconstructing a line of commits on a newer base, and the retention that must precede publishing the result.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-26T00:00:00Z
---

# Rebase

Rebase copies the changes represented by commits and records new commits on top
of another base.

## Build the idea

Because parent identities are part of each commit, the reconstructed commits
normally receive new [object ids](./commit-hash.md). Conflicts are resolved
while replaying them.

## In Cairn

The path rebases onto the current remote trunk before producing implementation
candidate `C`. Checks, audit, and acceptance occur after the rebase and name the
new exact commit.

Publishing a rebased path branch replaces what the remote held, so every commit
the [work ledger](./work-ledger.md) names must already be reachable from a
[retention ref](./checkpoint-retention.md) before the push. A repository that
will not maintain that namespace must reach a current base by
[merge](./merge.md) instead.

## It does not prove

A successful rebase proves ancestry, not correctness. Conflict resolution may be
semantically wrong.

Related: [object id](./commit-hash.md), [conflict](./conflict.md),
[checkpoint retention](./checkpoint-retention.md),
[implementation candidate](./implementation-candidate.md).
