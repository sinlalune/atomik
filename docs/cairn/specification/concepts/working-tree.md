---
type: Cairn Concept
title: Working tree
description: The checked-out files that a person or process can currently edit.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-25T00:00:00Z
---

# Working tree

A working tree is the materialised set of [repository](./repository.md) files
attached to one [Git](./git.md) checkout.

## Build the idea

Edits first exist in the working tree. They may be unstaged, staged, or
committed. Two processes writing the same working tree can overwrite or confuse
each other's uncommitted state.

## In Cairn

One writer is assigned to a path's writable working tree at a time. User
inspection can occur there before a candidate is committed, but the result is
not yet a remote checkpoint.

## It does not prove

A working tree is local mutable state, not durable shared history.

Related: [worktree](./worktree.md), [commit](./commit.md),
[writer assignment](./writer-assignment.md).
