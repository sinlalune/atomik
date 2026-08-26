---
type: Cairn Concept
title: Worktree
description: An additional Git checkout with its own files and current branch.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-25T00:00:00Z
---

# Worktree

A [Git](./git.md) worktree is an additional working directory connected to the
same [repository](./repository.md) object database.

## Build the idea

Separate worktrees let branches expose different file states at the same time.
They reduce accidental cross-path edits and allow independent tools or
applications to run with path-specific profiles.

## In Cairn

Every executable coding path receives a dedicated worktree. Cleanup occurs
only after remote integration is proved, from another checkout, and only when
the exact secondary worktree is clean.

## It does not prove

A worktree does not prevent two processes from editing it. Exclusivity comes
from writer assignment or an external lease.

Related: [working tree](./working-tree.md), [branch](./branch.md),
[writer assignment](./writer-assignment.md).
