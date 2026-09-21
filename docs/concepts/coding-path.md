---
type: Cairn Concept
title: Coding path
description: One bounded outcome and its durable route from acceptance to integration, on the route its risk earns.
tags: [cairn, concept, path]
timestamp: 2026-08-26T00:00:00Z
---

# Coding path

A coding path is one bounded change represented by a
[path record](./path-record.md), path [branch](./branch.md), dedicated
[worktree](./worktree.md), current [writer assignment](./writer-assignment.md),
ordered steps, and [remote checkpoints](./remote-checkpoint.md).

## Build the idea

The path is larger than a branch and smaller than the whole project. It joins
intent, implementation, evidence, and handoff state into one independently
navigable unit.

## In Cairn

Many paths can execute concurrently. Each completed checkpoint is pushed to its
remote branch, so another authorised developer or agent can fetch the path and
continue it. Registration and integration connect the path to the shared trunk.

Every path declares a **route**, and the route decides how much ceremony the
change carries:

- [`lightweight`](./lightweight-path.md) — the default: one work unit, combined
  records, exact acceptance retained;
- `full` — required for control-plane, architecture, multi-area, multi-unit, or
  high-risk work;
- [`foundation`](./foundation-path.md) — documents as work units, for a
  repository's first hour or for back-documenting an existing one.

The route changes which artifacts exist. It never changes what a path *is*: one
bounded outcome, one branch, one writer at a time, resumable from its last
checkpoint.

## It does not prove

Declaring a path does not guarantee its scope is independent or its result is
correct — nor does declaring a route make the work as small as the route
assumes.

Related: [path record](./path-record.md),
[lightweight path](./lightweight-path.md),
[remote checkpoint](./remote-checkpoint.md), [lifecycle](./lifecycle.md).
