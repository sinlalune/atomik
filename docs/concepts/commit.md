---
type: Cairn Concept
title: Commit
description: A recorded Git snapshot with parents, author information, and a message.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-25T00:00:00Z
---

# Commit

A commit is a recorded snapshot of a [repository](./repository.md) plus links to
its parent commit or commits.

## Build the idea

Before a commit, edits exist only in a working tree. A commit gives the state a
stable place in the history graph. Its parent links preserve ordering and make
ancestry testable.

## In Cairn

One completed work unit becomes one coherent commit. The registration commit
introduces a path on the trunk. The implementation candidate commit is the
exact subject of audit and acceptance. Administrative commits after it are
strictly limited.

## It does not prove

A commit records content; it does not prove that the content works or was
reviewed.

Related: [object id](./commit-hash.md), [work unit](./work-unit.md),
[implementation candidate](./implementation-candidate.md).
