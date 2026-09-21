---
type: Cairn Concept
title: Repository
description: A project directory together with its Git object history and references.
tags: [cairn, concept, foundation, git]
timestamp: 2026-08-25T00:00:00Z
---

# Repository

A repository is a project directory managed by [Git](./git.md), including its
recorded commits, branches, and configuration.

## Build the idea

The visible directory is only one checkout. Git also stores a graph of earlier
snapshots and names that point into it. Another clone can contain the same
history while having a different current checkout.

## In Cairn

The repository is the protocol boundary. Knowledge, execution records, checker
code, and product work travel together. Pulling the remote branches gives an
authorised participant both the work and the information needed to resume it.

## It does not prove

A repository can contain contradictory or stale files. Canonical ownership,
checks, and review are still required.

Related: [Git](./git.md), [working tree and worktree](./worktree.md),
[project memory](./project-memory.md).
