---
type: Cairn Concept
title: Working tree and worktree
description: The checked-out files a process can edit, and the additional checkouts that let several branches be materialised at once.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-26T00:00:00Z
---

# Working tree and worktree

A working tree is the materialised set of [repository](./repository.md) files
attached to one [Git](./git.md) checkout. A Git *worktree* is an additional
working directory connected to the same repository object database.

## Build the idea

Edits first exist in a working tree. They may be unstaged, staged, or
committed. Two processes writing the same working tree can overwrite or confuse
each other's uncommitted state.

Separate worktrees let branches expose different file states at the same time.
They reduce accidental cross-path edits and allow independent tools or
applications to run with path-specific profiles.

## In Cairn

Every executable coding path receives a dedicated worktree, and one writer is
assigned to that writable working tree at a time. Work held there for review is
committed and pushed as a [provisional commit](./provisional-commit.md) rather
than left only on disk, because a working tree is the one place the protocol
cannot recover from.

Cleanup occurs only after remote integration is proved, from another checkout,
and only when the exact secondary worktree is clean.

## It does not prove

A working tree is local mutable state, not durable shared history. A worktree
does not prevent two processes from editing it; exclusivity comes from
[writer assignment](./writer-assignment.md) or an external lease.

Related: [branch](./branch.md), [writer assignment](./writer-assignment.md),
[provisional commit](./provisional-commit.md), [commit](./commit.md).
