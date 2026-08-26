---
type: Cairn Concept
title: Rebase
description: Reconstructing a line of commits on a newer base.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-25T00:00:00Z
---

# Rebase

Rebase copies the changes represented by commits and records new commits on top
of another base.

## Build the idea

Because parent identities are part of each commit, the reconstructed commits
normally receive new hashes. Conflicts are resolved while replaying them.

## In Cairn

The path rebases onto the current remote trunk before producing implementation
candidate `C`. Checks, audit, and acceptance occur after the rebase and name the
new exact commit.

## It does not prove

A successful rebase proves ancestry, not correctness. Conflict resolution may
be semantically wrong.

Related: [commit hash](./commit-hash.md), [conflict](./conflict.md),
[implementation candidate](./implementation-candidate.md).

