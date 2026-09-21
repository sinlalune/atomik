---
type: Cairn Concept
title: Branch
description: A movable Git name that points to the latest commit on one line of work.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-25T00:00:00Z
---

# Branch

A branch is a movable name pointing to a [commit](./commit.md).

## Build the idea

New commits advance the current branch name. Two branches can share earlier
history and then point to different descendants. The branch is not a folder and
does not contain a second copy of every file.

## In Cairn

Each coding path has the canonical branch `path/<lowercase-id>`. The remote
version carries completed checkpoints that another participant can fetch and
resume.

## It does not prove

A branch does not assign a writer, isolate a filesystem, or guarantee that its
commits have been pushed.

Related: [worktree](./worktree.md), [remote checkpoint](./remote-checkpoint.md),
[writer assignment](./writer-assignment.md).
